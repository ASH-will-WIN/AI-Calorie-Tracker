const NVIDIA_MODEL = "nvidia/nemotron-3.5-super-vl-120b-a12b";
const MAX_RESPONSE_TOKENS = 256;

function makeRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function redactDiagnostic(value, mealDescription) {
  let detail = String(value || "");

  if (mealDescription) {
    detail = detail
      .replaceAll(mealDescription, "[meal description]")
      .replaceAll(JSON.stringify(mealDescription), '"[meal description]"');
  }
  if (process.env.NVIDIA_API_KEY) {
    detail = detail.replaceAll(process.env.NVIDIA_API_KEY, "[redacted API key]");
  }

  return detail.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 800);
}

function getProviderErrorMessage(body) {
  const asText = (value) => typeof value === "string" ? value : JSON.stringify(value);

  try {
    const parsed = JSON.parse(body);
    const providerError = parsed.error;
    if (typeof providerError === "string") return providerError;
    if (providerError?.message) return asText(providerError.message);
    if (parsed.detail) return asText(parsed.detail);
    if (parsed.message) return asText(parsed.message);
  } catch {
    // Non-JSON error bodies are returned as a short diagnostic excerpt.
  }

  return body || "The provider returned an empty error response.";
}

function fail(res, requestId, status, code, message, details) {
  const diagnostic = { requestId, code, message, details };
  console.error(`[parse-meal:${requestId}] ${JSON.stringify(diagnostic)}`);
  return res.status(status).json({ error: message, code, details, requestId });
}

function parseNutrition(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  const fields = ["calories", "protein", "carbs", "fat"];

  for (const field of fields) {
    if (typeof parsed[field] !== "number" || !Number.isFinite(parsed[field]) || parsed[field] < 0) {
      throw new Error(`Invalid or missing numeric field: ${field}`);
    }
  }

  return {
    calories: Math.round(parsed.calories),
    protein: Math.round(parsed.protein * 10) / 10,
    carbs: Math.round(parsed.carbs * 10) / 10,
    fat: Math.round(parsed.fat * 10) / 10,
  };
}

export default async function handler(req, res) {
  const requestId = makeRequestId();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }
  if (text.length > 500) {
    return res.status(400).json({ error: "Meal descriptions must be 500 characters or fewer" });
  }

  if (!process.env.NVIDIA_API_KEY) {
    return fail(
      res,
      requestId,
      503,
      "NVIDIA_API_KEY_MISSING",
      "Meal nutrition service is not configured.",
      "Set NVIDIA_API_KEY in the deployment environment and redeploy."
    );
  }

  const prompt = `You estimate nutrition for meals, including common international foods and Indian home cooking.

Rules:
- Estimate portions from cues such as large (1.5x), small (0.5x), and handful (28g/1oz). Use a standard serving when no portion is given.
- Account for likely cooking fats and dense ingredients such as ghee, oil, paneer, and lentils.
- Return calories as a whole number and protein, carbs, and fat in grams.
- Keep calories reasonably consistent with (protein * 4) + (carbs * 4) + (fat * 9).
- Return only a valid JSON object. Do not include markdown or explanations.

Schema: {"calories": number, "protein": number, "carbs": number, "fat": number}
Meal description: ${JSON.stringify(text)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 1,
        top_p: 0.95,
        max_tokens: MAX_RESPONSE_TOKENS,
        seed: 42,
        stream: false,
        reasoning_effort: "none",
      }),
    });

    const responseBody = await response.text();
    if (!response.ok) {
      const providerMessage = redactDiagnostic(getProviderErrorMessage(responseBody), text);
      return fail(
        res,
        requestId,
        502,
        "NVIDIA_UPSTREAM_ERROR",
        "NVIDIA rejected or could not process the nutrition request.",
        `Model ${NVIDIA_MODEL}; HTTP ${response.status}: ${providerMessage}`
      );
    }

    let data;
    try {
      data = JSON.parse(responseBody);
    } catch {
      return fail(
        res,
        requestId,
        502,
        "NVIDIA_INVALID_RESPONSE_JSON",
        "NVIDIA returned a response that was not valid JSON.",
        `HTTP ${response.status}: ${redactDiagnostic(responseBody, text) || "Empty response body."}`
      );
    }

    if (!data || typeof data !== "object") {
      return fail(
        res,
        requestId,
        502,
        "NVIDIA_INVALID_RESPONSE_SHAPE",
        "NVIDIA returned a response in an unexpected format.",
        `Expected a JSON object; received ${data === null ? "null" : typeof data}.`
      );
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      const finishReason = data.choices?.[0]?.finish_reason || "not provided";
      return fail(
        res,
        requestId,
        502,
        "NVIDIA_EMPTY_MODEL_OUTPUT",
        "NVIDIA returned no nutrition content.",
        `Response keys: ${Object.keys(data).join(", ") || "none"}; finish reason: ${finishReason}; max_tokens: ${MAX_RESPONSE_TOKENS}.`
      );
    }

    try {
      return res.status(200).json({ ...parseNutrition(content.trim()) });
    } catch (error) {
      return fail(
        res,
        requestId,
        502,
        "NVIDIA_INVALID_MODEL_OUTPUT",
        "NVIDIA returned nutrition content that could not be parsed.",
        redactDiagnostic(`${error.message}. Model output: ${content}`, text)
      );
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return fail(
        res,
        requestId,
        504,
        "NVIDIA_REQUEST_TIMEOUT",
        "NVIDIA did not respond before the 25-second timeout.",
        "Check NVIDIA service status and model availability, then retry."
      );
    }

    const details = redactDiagnostic(`${error.name || "Error"}: ${error.message}`, text);
    return fail(
      res,
      requestId,
      502,
      "NVIDIA_NETWORK_ERROR",
      "The server could not complete its request to NVIDIA.",
      details
    );
  } finally {
    clearTimeout(timeout);
  }
}
