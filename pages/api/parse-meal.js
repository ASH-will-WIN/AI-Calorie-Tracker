export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const prompt = `You are a nutritionist expert. Analyze this food and return ONLY a JSON object with calories and macros.
  
  Food to analyze: "${text}"
  
  Rules:
  1. Return valid JSON only
  2. Format: {"calories": number, "protein": number, "carbs": number, "fat": number}
  3. Use realistic values
  4. All numbers should be positive
  5. Calories should roughly equal: (protein*4 + carbs*4 + fat*9)
  
  Example responses:
  - "2 eggs": {"calories": 140, "protein": 12, "carbs": 0, "fat": 10}
  - "slice of bread": {"calories": 80, "protein": 3, "carbs": 15, "fat": 1}
  - "chicken breast": {"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6}`;

  // Check if OpenRouter API key is configured
  if (!process.env.OPENROUTER_KEY) {
    console.warn('OpenRouter API key not configured. Using mock response for demo.');
    // Return mock data for demo purposes
    const mockResponses = {
      '2 eggs': { calories: 140, protein: 12, carbs: 0, fat: 10 },
      'toast': { calories: 80, protein: 3, carbs: 15, fat: 1 },
      'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
      'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
      'salmon': { calories: 208, protein: 25, carbs: 0, fat: 12 },
      'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
      'bread': { calories: 80, protein: 3, carbs: 15, fat: 1 },
      'milk': { calories: 103, protein: 8, carbs: 12, fat: 2.4 },
      'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 }
    };

    // Find the best match for the input text
    let bestMatch = null;
    let bestScore = 0;
    
    Object.keys(mockResponses).forEach(key => {
      if (text.toLowerCase().includes(key.toLowerCase())) {
        const score = key.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = mockResponses[key];
        }
      }
    });

    // Return mock response or default
    const response = bestMatch || { calories: 200, protein: 10, carbs: 20, fat: 8 };
    return res.status(200).json(response);
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
          "HTTP-Referer": "https://localhost:3000",
          "X-Title": "Calorie Tracker",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 150,
        }),
      }
    );

    if (!response.ok) {
      console.error("API error:", await response.text());
      return res.status(500).json({ error: "Failed to parse meal" });
    }

    const data = await response.json();
    console.log("API Response:", data); // Debug log

    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      console.error("Empty response:", data);
      return res.status(500).json({ error: "Empty response from API" });
    }

    // Try to extract JSON if it's wrapped in other text
    try {
      const jsonMatch = content.match(/\{[^]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }

      const parsedData = JSON.parse(content);

      // Basic validation
      if (
        typeof parsedData.calories !== "number" ||
        typeof parsedData.protein !== "number" ||
        typeof parsedData.carbs !== "number" ||
        typeof parsedData.fat !== "number"
      ) {
        throw new Error("Missing required numeric fields");
      }

      // Round all numbers to 1 decimal place
      const result = {
        calories: Math.round(parsedData.calories),
        protein: Math.round(parsedData.protein * 10) / 10,
        carbs: Math.round(parsedData.carbs * 10) / 10,
        fat: Math.round(parsedData.fat * 10) / 10,
      };

      // Validate the calorie calculation is roughly correct
      const calculatedCalories = Math.round(
        result.protein * 4 + result.carbs * 4 + result.fat * 9
      );

      // Allow for a 30% margin of error in calorie calculations
      const marginOfError =
        Math.abs(result.calories - calculatedCalories) / result.calories;
      if (marginOfError > 0.3) {
        console.warn("Calorie calculation mismatch:", {
          provided: result.calories,
          calculated: calculatedCalories,
          difference: marginOfError,
        });
      }

      res.status(200).json(result);
    } catch (parseError) {
      console.error("Parse error:", parseError.message, "Content:", content);
      res.status(500).json({ error: "Invalid response format" });
    }
  } catch (error) {
    console.error("Network error:", error);
    res.status(500).json({ error: "Service unavailable" });
  }
}
