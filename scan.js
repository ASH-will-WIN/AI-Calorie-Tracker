#!/usr/bin/env node
'use strict';
/*
 * etherhiding-detector — static scanner for blockchain-hosted ("EtherHiding")
 * malware loaders and other malicious code injected into JavaScript / TypeScript
 * build-configuration files (next.config.js, postcss.config.js, vite.config.*, ...).
 *
 * Background: the EtherHiding technique (Mandiant tracks the actor as UNC5142)
 * appends an obfuscated loader to a build config. At build time the loader pulls
 * its real payload from a public blockchain (TRON/Aptos pointer -> BNB Smart Chain
 * calldata), decrypts it in memory, and runs an infostealer/RAT. Because the
 * payload lives on-chain and nothing malicious touches disk, a file scan that only
 * looks for "known bad files" misses it. This tool looks for the LOADER and its
 * structural tells instead, in both the working tree and full git history.
 *
 * Safety: this scanner only READS files and runs read-only git commands
 * (rev-list, cat-file). It NEVER executes, evals, requires, or network-fetches
 * the code it inspects. The indicators below are inert data.
 *
 * Usage:
 *   node scan.js [path]            scan a working tree (default: current dir)
 *   node scan.js --history [path]  also scan every blob in git history
 *   node scan.js --all [path]      scan all JS/TS files, not just build configs
 *   node scan.js --json [path]     machine-readable output
 *   node scan.js --signatures-only IOC string-match only (no heuristics)
 *   node scan.js --quiet           print only on findings
 *
 * Exit codes: 0 = clean, 1 = findings, 2 = usage/internal error.
 *
 * MIT licensed. No warranty. Reporting/IR guidance in README.md.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const VERSION = '0.1.1';

/* -------------------------------------------------------------------------- *
 * Known indicators of compromise (EtherHiding / UNC5142 campaign).
 * These are data only — no executable payload is included anywhere in this repo.
 * -------------------------------------------------------------------------- */
// Indicators are stored base64-encoded so THIS file never contains the literal
// strings it scans for. Otherwise the scanner would flag its own source — and any
// repo that vendors scan.js — under --all / --all-objects (where pathless blobs
// can't be filtered by --exclude). Decoded once at load.
const _dec = (s) => Buffer.from(s, 'base64').toString('utf8');
const KNOWN = {
  c2Ips: ["MTk4LjEwNS4xMjcuMjEw"].map(_dec),
  rpcHosts: ["YXBpLnRyb25ncmlkLmlv", "ZnVsbG5vZGUubWFpbm5ldC5hcHRvc2xhYnMuY29t", "YnNjLWRhdGFzZWVkLmJpbmFuY2Uub3Jn", "YnNjLXJwYy5wdWJsaWNub2RlLmNvbQ=="].map(_dec),
  xorKeys: ["MltnV2ZHajs8Oi05M1peQw==", "bTY6dFRoXkQpY0J6P05NXQ=="].map(_dec),
  // obfuscation table variable seen on-disk; may mutate between builds → "high".
  codeMarkers: ["XyRfOGRiZQ=="].map(_dec),
  // TRON pointers / Aptos fallbacks / BSC payload-storage txs (on-chain dead drops).
  deadDrops: ["VENxZjZaa2FRRDg0dllzQzJjdXUxalJ3QjZKdmVUYVJyRg==", "VEZNcnlCOW02ZDRrQk1SakVWeUZSYnFLU1YxY1YyTmNwSA==", "VEE0OGRjdDZyRlc4QlhzaUxBdGpGYVZGb1N1cnlNakQzdg==", "MHg5ZDIwMmM4MjQ0MDJjYTg5ZTlhYWNjZDIzOTBiNmY4YjMzMmFlNzQzY2FhMTQ2OWM2OTVmZWIyNzgxZDU2NTE5", "MHgzZDIwNzVmOTdiN2IxZTMyMzRiZDY1Mzc3OWQyMWM2MDVkN2Q4YzZlYzljOThkOTgzODgwYmU1YzdmNGY5NDcx", "MHg1MzNiMmRiY2FlZmYxOWNkMWY3OTkyMzRhMjdiNTc4ZDcxM2Q4ZmNhYTM0MWI3NTAxZTQ1MjYxMDY0ODNlMGIx", "MHg1YWI4NWFiZTZjNjdhZGI5NDMyMmU1NzAwYTM2OTE1YzM4ZDFkYjFlNjA0OTIwZGE4YWE0ZmNiNTMwNDA4YWYw", "MHhiY2M5NzZlMWM4ZjNkZmQ5M2UxNDZmZjQyNDgzNmE5NjM1YWIzNmQ5OTFhNTQ2NzU2MzVkN2ZkZjMwZTYwNjE2", "MHhiNmM3MjU4OTBiZTY4OTBmZDJjNzM1ZWVkYzQ3ZTI0Yjg1YTM1MDMwMWY2YzE5YTM4NjRlNDNjMzVlNDcwOTY4"].map(_dec),
  // sha256 of the original analyzed dropper — a hex digest, not a string the scanner
  // pattern-matches, so it is safe to keep literal (and self-hash never equals it).
  sampleSha256: ['e27abe7e810c79d71e8c1681ccd010d7ddbda6a9a34bf1124ba392a36ba9b476'],
  // PolinRider (DPRK-linked supply-chain campaign; shares the EtherHiding loader
  // lineage but also abuses VS Code folder-open tasks, fake-font payloads, and git
  // force-push artifacts). base64 for the same self-match reason as the rest.
  polinrider: {
    // payload signatures, typosquat npm names, and VS Code tokens — all base64 so
    // THIS file never contains the literal indicators it scans for (decoded at load).
    sigs: ["KCJybWNlaiVvdGIlIiwyODU3Njg3KQ==", "Q290JTN0PXNodFA="].map(_dec),
    pkgs: ["dGFpbHdpbmRjc3Mtc3R5bGUtYW5pbWF0ZQ==", "dGFpbHdpbmQtbWFpbmFuaW1hdGlvbg==", "dGFpbHdpbmQtYXV0b2FuaW1hdGlvbg==", "dGFpbHdpbmQtYW5pbWF0aW9uYmFzZWQ=", "dGFpbHdpbmRjc3MtdHlwb2dyYXBoeS1zdHlsZQ==", "dGFpbHdpbmRjc3Mtc3R5bGUtbW9kaWZ5", "dGFpbHdpbmRjc3MtYW5pbWF0ZS1zdHlsZQ=="].map(_dec),
    vscodeTokens: ["Zm9sZGVyT3Blbg==", "YWxsb3dBdXRvbWF0aWNUYXNrcw=="].map(_dec),
  },
};

/* -------------------------------------------------------------------------- *
 * File matchers
 * -------------------------------------------------------------------------- */
const CONFIG_RE = new RegExp(
  '(^|/)(' +
    'next\\.config\\.(js|cjs|mjs|ts)|' +
    'postcss\\.config\\.(js|cjs|mjs|ts)|' +
    'tailwind\\.config\\.(js|cjs|mjs|ts)|' +
    'vite\\.config\\.(js|cjs|mjs|ts)|' +
    'vitest\\.config\\.(js|cjs|mjs|ts)|' +
    'webpack\\.config\\.(js|cjs|mjs|ts)|' +
    'rollup\\.config\\.(js|cjs|mjs|ts)|' +
    'svelte\\.config\\.(js|cjs|mjs)|' +
    'nuxt\\.config\\.(js|cjs|mjs|ts)|' +
    'astro\\.config\\.(js|cjs|mjs|ts)|' +
    'remix\\.config\\.(js|cjs|mjs)|' +
    'gatsby-(config|node|browser|ssr)\\.(js|ts)|' +
    'babel\\.config\\.(js|cjs|mjs)|' +
    'jest\\.config\\.(js|cjs|mjs|ts)|' +
    'vue\\.config\\.(js|cjs)|' +
    'metro\\.config\\.(js|cjs)|' +
    'ecosystem\\.config\\.(js|cjs)|' +
    '\\.eslintrc\\.(js|cjs)|' +
    '\\.prettierrc\\.(js|cjs)' +
  ')$',
  'i'
);
const JSTS_RE = /\.(js|cjs|mjs|jsx|ts|cts|mts|tsx)$/i;
const PKG_RE = /(^|\/)package\.json$/i;
// PolinRider-relevant non-config files: VS Code auto-run config, git force-push
// artifacts, and font assets (the campaign ships JS payloads as fake .woff2/.ttf).
const VSCODE_RE = /(^|\/)\.vscode\/(tasks|settings)\.json$/i;
const PR_PUSH_RE = /(^|\/)temp_(auto|interactive)_push\.bat$/i;
const FONT_RE = /\.(woff2?|ttf|otf)$/i;
const polinFile = (p) => VSCODE_RE.test(p) || PR_PUSH_RE.test(p) || FONT_RE.test(p);
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.turbo', 'coverage',
  '.cache', 'out', '.svelte-kit', '.vercel', '.nuxt', 'vendor', '.yarn',
]);

/* -------------------------------------------------------------------------- *
 * Small helpers
 * -------------------------------------------------------------------------- */
function shannon(s) {
  if (!s.length) return 0;
  const freq = Object.create(null);
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  let h = 0;
  for (const k in freq) {
    const p = freq[k] / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}
function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}
function snippet(content, index, len) {
  // Show a window centered on the match within its line, so evidence points at
  // the payload rather than a benign line prefix (loaders append to long lines).
  const lineStart = content.lastIndexOf('\n', index) + 1;
  let lineEnd = content.indexOf('\n', index);
  if (lineEnd === -1) lineEnd = content.length;
  const line = content.slice(lineStart, lineEnd);
  const col = Math.max(0, index - lineStart);
  const half = Math.floor((len || 160) / 2);
  const from = Math.max(0, col - half);
  const to = Math.min(line.length, col + half);
  return (from > 0 ? '…' : '') + line.slice(from, to).trim() + (to < line.length ? '…' : '');
}
function literalHits(content, literal) {
  const idxs = [];
  let from = 0;
  for (;;) {
    const i = content.indexOf(literal, from);
    if (i === -1) break;
    idxs.push(i);
    from = i + literal.length;
  }
  return idxs;
}
function regexHits(content, re) {
  const idxs = [];
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = r.exec(content)) !== null) {
    idxs.push(m.index);
    if (m.index === r.lastIndex) r.lastIndex++; // guard zero-width
  }
  return idxs;
}
function jsonValueEnd(s) {
  // Index just past the first top-level JSON object/array (or -1). Lets us detect
  // executable JS appended AFTER an otherwise-valid JSON document.
  let i = 0;
  while (i < s.length && (s[i] === ' ' || s[i] === '\t' || s[i] === '\n' || s[i] === '\r')) i++;
  const open = s[i];
  if (open !== '{' && open !== '[') return -1;
  let depth = 0, inStr = false, esc = false;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') { if (--depth === 0) return i + 1; }
  }
  return -1;
}

/* -------------------------------------------------------------------------- *
 * Detection rules. Each pushes findings onto `out`.
 * A finding: { severity, rule, title, file, line, evidence, ref }
 * -------------------------------------------------------------------------- */
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const REF = 'https://cloud.google.com/blog/topics/threat-intelligence/etherhiding (UNC5142)';
const REF_PR = 'https://threats.wiz.io/all-incidents/polinrider-supply-chain-attack (PolinRider)';

function analyze(file, content, opts) {
  const out = [];
  const norm = file.replace(/\\/g, '/');
  const isConfig = !!opts.forceConfig || CONFIG_RE.test(norm);
  const isPkg = !!opts.forcePkg || /(^|[\/\\])package\.json$/i.test(file);
  const isVscode = !!opts.forceVscode || VSCODE_RE.test(norm);
  const isPushArtifact = !!opts.forcePushArtifact || PR_PUSH_RE.test(norm);
  const isJson = !!opts.forceJson || /\.json$/i.test(norm);
  const add = (severity, rule, title, index, ref) =>
    out.push({
      severity, rule, title, file,
      line: lineOf(content, index),
      evidence: snippet(content, index),
      ref: ref || REF,
    });

  /* ---- Layer 1: known IOC string matches (apply everywhere) ---- */
  for (const ip of KNOWN.c2Ips)
    for (const i of literalHits(content, ip))
      add('critical', 'ioc.c2', `Known EtherHiding C2 address (${ip})`, i);

  for (const key of KNOWN.xorKeys)
    for (const i of literalHits(content, key))
      add('critical', 'ioc.xorkey', 'Known EtherHiding stage XOR key', i);

  for (const addr of KNOWN.deadDrops)
    for (const i of literalHits(content, addr))
      add('critical', 'ioc.deaddrop', `Known on-chain dead-drop address (${addr.slice(0, 10)}…)`, i);

  for (const host of KNOWN.rpcHosts)
    for (const i of literalHits(content, host))
      add(isConfig ? 'high' : 'medium', 'ioc.rpchost', `Blockchain RPC host in source (${host})`, i);

  for (const cm of KNOWN.codeMarkers)
    for (const i of literalHits(content, cm))
      add('high', 'ioc.codemarker', `EtherHiding obfuscation marker (${cm}; may mutate)`, i);

  // campaign in-process marker, all access/quote forms. dot access stays scoped to
  // the known property names (_V / i); the bracket form is generalized to any short
  // property and to the 3-part value (8-NNNN-N) so it also covers PolinRider's variant.
  for (const i of regexHits(content,
    /global\s*(?:\.\s*(?:_V|i)\b|\[\s*['"][^'"]{1,3}['"]\s*\])\s*=\s*['"]8-\d{2,4}(?:-\d{1,3})?['"]/))
    add('critical', 'ioc.marker', 'EtherHiding/PolinRider in-process marker (global[x] = "8-…")', i);

  /* ---- Layer 1b: PolinRider known indicators (apply everywhere) ---- */
  for (const sig of KNOWN.polinrider.sigs)
    for (const i of literalHits(content, sig))
      add('critical', 'ioc.pr.sig', 'Known PolinRider payload signature', i, REF_PR);

  // typosquat npm names. Critical ONLY when the name is an actual dependency KEY in a
  // parseable package.json (the attack); a mere substring (prose, a security writeup,
  // even this tool's own README) is high — so it can't false-trip a --fail-on=critical
  // gate (R4-2). depKeys is null unless this is a parseable package.json.
  let depKeys = null;
  if (isPkg) {
    try {
      const pj = JSON.parse(content);
      depKeys = new Set([].concat(
        Object.keys(pj.dependencies || {}), Object.keys(pj.devDependencies || {}),
        Object.keys(pj.optionalDependencies || {}), Object.keys(pj.peerDependencies || {})));
    } catch (_) { /* not parseable JSON — treat any hit as a substring (high) */ }
  }
  for (const pkg of KNOWN.polinrider.pkgs)
    for (const i of literalHits(content, pkg))
      add(depKeys && depKeys.has(pkg) ? 'critical' : 'high', 'ioc.pr.pkg',
        `Known PolinRider typosquat dependency (${pkg})`, i, REF_PR);

  if (isPushArtifact)
    add('critical', 'ioc.pr.pushartifact', 'PolinRider git force-push artifact (temp_*_push.bat)', 0, REF_PR);

  /* ---- Layer 2: generic heuristics ---- */
  if (!opts.signaturesOnly) {
    // marker-global cluster the loader sets (tokenized globals; see the rule below)
    const clusterToks = new Set();
    for (const re of [/\b_t_[sutc012]\b/g, /\b_p_t\b/g, /\bglobal\s*\.\s*i\s*=/g]) {
      const r = new RegExp(re.source, 'g');
      let m;
      while ((m = r.exec(content))) clusterToks.add(m[0].trim());
    }
    if (clusterToks.size >= 3) {
      const i = content.search(/\b_t_[sutc012]\b/);
      add('high', 'heur.markercluster',
        `Suspicious global cluster (${[...clusterToks].slice(0, 6).join(' ')}…)`, i < 0 ? 0 : i);
    }

    // Obfuscation-table variable family (the loader names it _$_ + 4 hex). The exact
    // suffix rotates per instance, so match the family generically; the specific
    // known value is also caught literally via KNOWN.codeMarkers above.
    for (const i of regexHits(content, /\b_\$_[0-9a-f]{4}\b/))
      add('medium', 'heur.obfvar', 'Obfuscation-table variable (_$_ + 4-hex family; may mutate)', i);

    /* ---- Layer 2b: PolinRider structural tells (file-type gated, not config-shape) ---- */
    // VS Code auto-run: a task that runs on folder-open + the setting that allows it
    // silently — the campaign's editor-exec trigger.
    // folderOpen is also a *legitimate* VS Code feature, so severity is command-gated
    // (FP-1): folder-open + a fetch/exec-shaped command = HIGH; folder-open + an ordinary
    // command = MEDIUM ("review"), to stay out of the --fail-on=critical,high gate on
    // benign repos. A tasks.json is recognized by path, or by JSON shape for path-less
    // --all-objects blobs (R4-1: catches a dangling/force-pushed one).
    const folderOpenTok = KNOWN.polinrider.vscodeTokens[0];
    const isTasksJson = (isVscode && /tasks\.json/i.test(norm))
      || (opts.pathless && /["']tasks["']\s*:/.test(content));
    if (isTasksJson) {
      const at = content.indexOf(folderOpenTok);
      if (at !== -1) {
        const suspicious = /\b(curl|wget|powershell|pwsh|iex|invoke-webrequest|invoke-expression|certutil|bitsadmin|mshta|base64|atob|child_process)\b|node\s+(?:-e|--eval)|\$\(|https?:\/\/|\.(?:bat|cmd|ps1|vbs|scr|hta)\b/i.test(content);
        add(suspicious ? 'high' : 'medium', 'heur.pr.vscodeautorun',
          suspicious ? 'VS Code task auto-runs on folder open with a fetch/exec command (runOn folder-open)'
                     : 'VS Code task auto-runs on folder open — review the command (runOn folder-open)',
          at, REF_PR);
      }
    }
    if (isVscode && /settings\.json/i.test(norm))
      for (const i of literalHits(content, KNOWN.polinrider.vscodeTokens[1]))
        add('medium', 'heur.pr.vscodeautotask', 'VS Code workspace allows tasks to auto-run', i, REF_PR);

    // JSON document with executable JS appended after it (a loader glued onto a
    // config JSON / package.json). Skip JSONC (.vscode, allows comments) and
    // path-less --all-objects blobs (can't confirm they're JSON → noise).
    if (isJson && !isVscode && !opts.pathless) {
      const end = jsonValueEnd(content);
      if (end !== -1) {
        const tail = content.slice(end)
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1').trim();
        if (tail && /\b(eval|Function|require|atob|child_process|spawn|exec|process\.env)\b|=>|\bfunction\b/.test(tail))
          add('high', 'heur.pr.jsonappended', 'Executable JS appended after a JSON document', end, REF_PR);
      }
    }

    if (isConfig || opts.allFiles) {
      for (const i of regexHits(content, /\beval\s*\(/))
        add(isConfig ? 'high' : 'medium', 'heur.eval', 'eval of dynamic code', i);

      for (const i of regexHits(content, /\bnew\s+Function\s*\(|\bFunction\s*\(\s*['"`]/))
        add(isConfig ? 'high' : 'medium', 'heur.functionctor', 'Function() constructor building code', i);

      // detached / hidden child process — RAT launch signature
      const detached = /detached\s*:\s*true/.test(content);
      const hidden = /windowsHide\s*:\s*true/.test(content) || /stdio\s*:\s*['"]ignore['"]/.test(content);
      const spawns = /\b(spawn|exec|execFile|fork)\s*\(|require\(\s*['"]child_process['"]\s*\)/.test(content);
      if (spawns && (detached || hidden)) {
        const i = content.search(/\b(spawn|exec|execFile|fork)\s*\(|child_process/);
        add('high', 'heur.hiddenproc', 'Detached/hidden child-process launch in config', i < 0 ? 0 : i);
      }

      // The rules below are "config-shape" tells — strong signal in a known build
      // config, but noisy on arbitrary blobs. opts.pathless is set for --all-objects
      // objects (no known path), where we can't confirm the blob is a config; there
      // we keep only the universal signals above (eval/Function/hidden-proc/markers).
      const cfgShape = isConfig && !opts.pathless;

      // ESM shim injected into a CommonJS config (a tell the loader uses)
      if (cfgShape && /\.(js|cjs)$/i.test(file)) {
        for (const i of regexHits(content, /createRequire\s*\(\s*import\.meta\.url\s*\)/))
          add('medium', 'heur.esmshim', 'createRequire(import.meta.url) injected into CommonJS config', i);
      }

      // outbound network from a build config
      if (cfgShape)
        for (const i of regexHits(content, /\bfetch\s*\(|\bXMLHttpRequest\b|require\(\s*['"](https?|node:https?)['"]\s*\)|\bhttps?\.(get|request)\s*\(/))
          add('medium', 'heur.network', 'Network call inside a build config', i);

      // minified mega-line / high-entropy embedded blob (payload tells)
      if (cfgShape) {
        const lines = content.split('\n');
        let off = 0;
        for (const ln of lines) {
          if (ln.length > 500)
            add('medium', 'heur.megaline', `Very long line (${ln.length} chars) in a build config`, off);
          const blob = ln.match(/['"`][A-Za-z0-9+/=_\-]{160,}['"`]/);
          if (blob) {
            const body = blob[0].slice(1, -1);
            if (shannon(body) > 4.3)
              add('medium', 'heur.entropyblob',
                `High-entropy encoded blob (entropy ${shannon(body).toFixed(2)}, len ${body.length})`,
                off + (blob.index || 0));
          }
          off += ln.length + 1;
        }
      }

      // code appended after the final module.exports / export default
      const lastExport = Math.max(
        content.lastIndexOf('module.exports'),
        content.lastIndexOf('export default')
      );
      if (cfgShape && lastExport !== -1) {
        const tail = content.slice(lastExport);
        const closeIdx = tail.search(/[)};]\s*$/m);
        const after = closeIdx === -1 ? '' : tail.slice(closeIdx + 1);
        if (/\b(eval|Function|require|fetch|spawn|atob|Buffer\.from)\b/.test(after) || /.{400,}/.test(after))
          add('medium', 'heur.appended', 'Suspicious code AFTER the config\'s main export', lastExport);
      }
    }

    // package.json lifecycle scripts that fetch/run remote code (the npm vector)
    if (isPkg) {
      try {
        const pkg = JSON.parse(content);
        const scripts = pkg.scripts || {};
        for (const name of ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish']) {
          const v = scripts[name];
          if (typeof v === 'string' &&
              /(node\s+-e|node\s+--eval|curl\b|wget\b|\beval\b|base64\s+-d|\|\s*(sh|bash|node)\b|https?:\/\/|child_process)/i.test(v)) {
            const i = content.indexOf(JSON.stringify(name));
            add('high', 'heur.installhook',
              `package.json "${name}" script runs/fetches remote code`, i < 0 ? 0 : i);
          }
        }
      } catch (_) { /* not valid JSON; ignore */ }
    }
  }

  return out;
}

function fileHashFinding(file, content) {
  const h = crypto.createHash('sha256').update(content).digest('hex');
  if (KNOWN.sampleSha256.includes(h))
    return [{
      severity: 'critical', rule: 'ioc.filehash',
      title: `Exact match to known dropper (sha256 ${h.slice(0, 12)}…)`,
      file, line: 1, evidence: `sha256=${h}`, ref: REF,
    }];
  return [];
}

// Font magic bytes for genuine fonts. PolinRider ships JS payloads with a font
// extension (e.g. fa-solid-400.woff2); a "font" whose header is none of these is
// not a font. Real binary fonts match here and produce no finding.
const FONT_MAGIC = ['774F4632', '774F4646', '00010000', '4F54544F', '74727565', '74746366']
  .map((h) => Buffer.from(h, 'hex')); // wOF2, wOFF, TrueType, OTTO, 'true', 'ttcf'
function fakeFontFinding(file, buf) {
  if (!buf || buf.length < 4) return [];
  if (FONT_MAGIC.some((m) => buf.subarray(0, 4).equals(m))) return []; // genuine font
  const head = buf.subarray(0, 160).toString('latin1');
  // Git-LFS pointer where a font should be = unresolved checkout, not a payload (FP-2).
  if (/^version https:\/\/git-lfs\.github\.com\/spec\//.test(head))
    return [{ severity: 'low', rule: 'heur.pr.fakefont',
      title: 'Unresolved Git-LFS pointer in place of a font (not scanned)',
      file, line: 1, evidence: 'git-lfs pointer — run `git lfs checkout` to scan the real asset', ref: REF_PR }];
  // Scan the WHOLE text body for execution tells, not just a fixed head window — else a
  // payload padded past byte 400 silently downgrades itself to medium (R4-3). Cap huge
  // blobs. HTML where a font should be is almost always a botched download (medium).
  const CAP = 2 * 1024 * 1024;
  const body = (buf.length <= CAP ? buf : buf.subarray(0, CAP)).toString('latin1');
  const flat = body.replace(/\s+/g, ' ').trim();
  const codey = /\b(eval|Function|require|atob|child_process|spawn|exec|execSync|fromCharCode)\b|=>/.test(body);
  const html = /^\s*(<!doctype html|<html|<\?xml|<svg)/i.test(head);
  const severity = codey ? 'high' : 'medium';
  const note = codey ? `embedded script: ${flat.slice(0, 80)}`
    : html ? 'contains HTML, not font data (usually a botched/LFS download — verify the asset)'
    : 'not a recognized font header';
  return [{
    severity, rule: 'heur.pr.fakefont',
    title: 'Font asset is not a real font (magic-byte mismatch — possible PolinRider payload)',
    file, line: 1,
    evidence: `head=${buf.subarray(0, 4).toString('hex')} · ${note}`,
    ref: REF_PR,
  }];
}

/* -------------------------------------------------------------------------- *
 * Sources: working tree walk + git history blobs
 * -------------------------------------------------------------------------- */
function walk(root, opts, acc) {
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch (_) { return acc; }
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      walk(full, opts, acc);
    } else if (e.isFile()) {
      const rel = full.replace(/\\/g, '/');
      const wanted = ((opts.allFiles ? JSTS_RE.test(e.name) : (CONFIG_RE.test(rel) || PKG_RE.test(rel)))
        || polinFile(rel))
        && !opts.exclude.some((x) => rel.includes(x));
      if (wanted) acc.push(full);
    }
  }
  return acc;
}

function git(args, cwd) {
  return cp.execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}
function isGitRepo(dir) {
  try { git(['rev-parse', '--is-inside-work-tree'], dir); return true; }
  catch (_) { return false; }
}
// unique (sha, path) blobs reachable FROM REFS whose path matches our filter.
// Note: rev-list --all only reaches ref-anchored objects — a dropper in a commit
// that was force-pushed away is dangling and will NOT appear here. Use
// --all-objects (allObjectBlobs) to catch those.
function historyBlobs(root, opts) {
  const raw = git(['rev-list', '--objects', '--all'], root);
  const seen = new Set();
  const blobs = [];
  for (const line of raw.split('\n')) {
    const sp = line.indexOf(' ');
    if (sp === -1) continue; // commit/tree (no path) — skip
    const sha = line.slice(0, sp);
    const p = line.slice(sp + 1);
    if (seen.has(sha)) continue;
    const wanted = ((opts.allFiles ? JSTS_RE.test(p) : (CONFIG_RE.test(p) || PKG_RE.test(p)))
      || polinFile(p))
      && !opts.exclude.some((x) => p.includes(x));
    if (!wanted) continue;
    seen.add(sha);
    blobs.push({ sha, path: p });
  }
  return blobs;
}

// EVERY blob in the object store, including dangling/unreferenced objects left
// behind by a force-push (this is what catches a post-eradication dropper).
// Dangling blobs have no path, so callers treat them as potential configs.
function allObjectBlobs(root) {
  const raw = git(['cat-file', '--batch-all-objects', '--batch-check=%(objecttype) %(objectname)'], root);
  const blobs = [];
  for (const line of raw.split('\n')) {
    const sp = line.indexOf(' ');
    if (sp === -1) continue;
    if (line.slice(0, sp) !== 'blob') continue;
    blobs.push({ sha: line.slice(sp + 1).trim(), path: null });
  }
  return blobs;
}

// Sizes (bytes) for object shas via one --batch-check (reads no bodies). Lets us
// size-filter BEFORE fetching bodies, so a huge object can't blow the buffer and
// take a whole batch of small (possibly malicious) blobs down with it.
function batchCheckSizes(root, shas) {
  const m = new Map();
  if (!shas.length) return m;
  const out = cp.execFileSync('git', ['cat-file', '--batch-check'],
    { cwd: root, input: shas.join('\n') + '\n', encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  for (const line of out.split('\n')) {
    const p = line.split(' ');
    if (p.length >= 3 && p[1] !== 'missing') m.set(p[0], parseInt(p[2], 10));
  }
  return m;
}

// Parse `git cat-file --batch` framed output into res (Map<sha, Buffer>).
function parseBatchInto(out, res) {
  let off = 0;
  while (off < out.length) {
    const nl = out.indexOf(0x0a, off);
    if (nl === -1) break;
    const parts = out.toString('utf8', off, nl).split(' ');
    off = nl + 1;
    if (parts.length < 3 || parts[1] === 'missing') continue;
    const size = parseInt(parts[2], 10);
    if (!Number.isFinite(size)) break;
    res.set(parts[0], out.slice(off, off + size));
    off += size + 1; // body + trailing newline
  }
}

// Fetch blob bodies into res, degrading PER-BLOB (not per-chunk) on buffer overflow,
// so one oversized object can't hide small blobs batched alongside it.
function readBlobs(root, shas, res) {
  if (!shas.length) return;
  try {
    const out = cp.execFileSync('git', ['cat-file', '--batch'],
      { cwd: root, input: shas.join('\n') + '\n', maxBuffer: 512 * 1024 * 1024 });
    parseBatchInto(out, res);
  } catch (_) {
    if (shas.length === 1) return; // skip only this one over-large blob
    const mid = shas.length >> 1;
    readBlobs(root, shas.slice(0, mid), res);
    readBlobs(root, shas.slice(mid), res);
  }
}

/* -------------------------------------------------------------------------- *
 * Output
 * -------------------------------------------------------------------------- */
const COLOR = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const sevTag = (s) => ({
  critical: c('41;97', ' CRIT '), high: c('31;1', 'HIGH '),
  medium: c('33;1', 'MED  '), low: c('90', 'LOW  '),
}[s] || s);

function report(findings, opts, scanned) {
  if (opts.json) {
    process.stdout.write(JSON.stringify({ version: VERSION, scanned, findings }, null, 2) + '\n');
    return;
  }
  if (!findings.length) {
    if (!opts.quiet) console.log(c('32', `✓ clean — ${scanned} file(s)/blob(s) scanned, no indicators found.`));
    return;
  }
  findings.sort((a, b) => (SEV_ORDER[a.severity] - SEV_ORDER[b.severity]) || a.file.localeCompare(b.file));
  console.log(c('1', `\n✗ ${findings.length} indicator(s) found:\n`));
  for (const f of findings) {
    console.log(`${sevTag(f.severity)} ${c('1', f.title)}`);
    console.log(`      ${f.file}${f.line ? ':' + f.line : ''}  ${c('90', '[' + f.rule + ']')}`);
    if (f.evidence) console.log(`      ${c('90', f.evidence)}`);
  }
  const counts = findings.reduce((m, f) => ((m[f.severity] = (m[f.severity] || 0) + 1), m), {});
  console.log(c('1', `\nsummary: ` +
    ['critical', 'high', 'medium', 'low'].filter((s) => counts[s]).map((s) => `${counts[s]} ${s}`).join(', ')));
  console.log(c('90', `ref: ${REF}`));
  console.log(c('90', `If confirmed: treat the pushing machine as compromised, rotate all reachable secrets,`));
  console.log(c('90', `force-push clean history, and report the C2/sample (see README "Reporting").\n`));
}

/* -------------------------------------------------------------------------- *
 * Main
 * -------------------------------------------------------------------------- */
function main(argv) {
  const opts = { history: false, allObjects: false, allFiles: false, json: false, signaturesOnly: false, quiet: false, failOn: null, exclude: [] };
  const positional = [];
  let rest = false;
  for (const a of argv) {
    if (rest) { positional.push(a); continue; }
    if (a === '--') rest = true;                              // argv terminator: rest are paths
    else if (a === '--history') opts.history = true;
    else if (a === '--all-objects') { opts.history = true; opts.allObjects = true; }
    else if (a === '--all') opts.allFiles = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--signatures-only') opts.signaturesOnly = true;
    else if (a === '--quiet') opts.quiet = true;
    else if (a.startsWith('--fail-on=')) opts.failOn = a.slice(10).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--exclude=')) opts.exclude = a.slice(10).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--version' || a === '-v') { console.log(VERSION); return 0; }
    else if (a === '--help' || a === '-h') { console.log(HELP); return 0; }
    else if (a.startsWith('-')) { console.error(`unknown flag: ${a}`); return 2; }
    else positional.push(a);
  }
  // Validate --fail-on so a typo can't silently disable the gate (e.g. "critcal").
  if (opts.failOn) {
    const VALID = ['critical', 'high', 'medium', 'low'];
    const bad = opts.failOn.filter((s) => !VALID.includes(s));
    if (bad.length) {
      console.error(`invalid --fail-on severity: ${bad.join(', ')} (valid: ${VALID.join(', ')})`);
      return 2;
    }
  }
  const root = path.resolve(positional[0] || '.');
  if (!fs.existsSync(root)) { console.error(`path not found: ${root}`); return 2; }

  const findings = [];
  let scanned = 0;

  // working tree
  const stat = fs.statSync(root);
  const files = stat.isDirectory() ? walk(root, opts, []) : [root];
  for (const f of files) {
    let buf;
    try { buf = fs.readFileSync(f); } catch (_) { continue; }
    scanned++;
    if (FONT_RE.test(f)) {
      const ff = fakeFontFinding(f, buf);
      findings.push(...ff);
      if (ff.length && !buf.includes(0)) // a non-font, text "font": also IOC-scan the body
        findings.push(...analyze(f, buf.toString('utf8'), opts));
      continue;
    }
    if (buf.includes(0)) continue; // binary (non-font) — nothing to text-scan
    const content = buf.toString('utf8');
    findings.push(...fileHashFinding(f, content));
    findings.push(...analyze(f, content, opts));
  }

  // git history
  if (opts.history) {
    if (!(stat.isDirectory() && isGitRepo(root))) {
      if (!opts.quiet) console.error(c('33', 'warning: --history/--all-objects requested but target is not a git work tree; skipped.'));
    } else {
      try {
        const blobs = opts.allObjects ? allObjectBlobs(root) : historyBlobs(root, opts);
        const CAP = 5 * 1024 * 1024; // skip blobs larger than this
        const sizes = batchCheckSizes(root, blobs.map((b) => b.sha));
        const small = blobs.filter((b) => (sizes.has(b.sha) ? sizes.get(b.sha) : Infinity) <= CAP);
        const skipped = blobs.length - small.length;
        if (skipped && !opts.quiet) console.error(c('90', `note: skipped ${skipped} git object(s) larger than ${CAP} bytes`));

        // fetch bodies in size-bounded batches; readBlobs degrades per-blob on overflow
        const contents = new Map();
        const BUDGET = 64 * 1024 * 1024;
        let batch = [], batchBytes = 0;
        const flush = () => { if (batch.length) { readBlobs(root, batch, contents); batch = []; batchBytes = 0; } };
        for (const b of small) {
          const sz = sizes.get(b.sha) || 0;
          if (batch.length && batchBytes + sz > BUDGET) flush();
          batch.push(b.sha); batchBytes += sz;
          if (batch.length >= 500) flush();
        }
        flush();

        for (const b of small) {
          const buf = contents.get(b.sha);
          if (!buf) continue; // missing
          const where = opts.allObjects ? 'all-objects' : 'history';
          const label = b.path ? `${b.path}@${b.sha.slice(0, 10)}` : `object ${b.sha.slice(0, 10)}`;
          if (b.path && FONT_RE.test(b.path)) { // a "font" that survived the binary filter is text masquerading as one
            scanned++;
            findings.push(...fakeFontFinding(`${label} (${where})`, buf));
            continue;
          }
          if (buf.includes(0)) continue; // binary non-font — nothing to text-scan
          const content = buf.toString('utf8');
          scanned++;
          const blobOpts = {
            ...opts,
            forceConfig: opts.allObjects || (!!b.path && CONFIG_RE.test(b.path)),
            // R4-2: do NOT force pkg on path-less blobs — else a typosquat name as a mere
            // substring (docs/writeups) would fire critical. Real package.json keys only.
            forcePkg: !!b.path && /(^|\/)package\.json$/.test(b.path),
            forceVscode: !!b.path && VSCODE_RE.test(b.path),
            forcePushArtifact: !!b.path && PR_PUSH_RE.test(b.path),
            forceJson: !!b.path && /\.json$/i.test(b.path),
            pathless: opts.allObjects && !b.path, // suppress config-shape heuristics
          };
          findings.push(...fileHashFinding(`${label} (${where})`, content));
          findings.push(...analyze(`${label} (${where})`, content, blobOpts));
        }
      } catch (e) {
        console.error(c('33', `warning: history scan failed: ${e.message}`));
      }
    }
  }

  // collapse duplicate hits of the same rule on the same file+line
  const seen = new Set();
  const deduped = findings.filter((f) => {
    const k = `${f.rule}|${f.file}|${f.line}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  report(deduped, opts, scanned);
  const failSet = opts.failOn && opts.failOn.length ? new Set(opts.failOn) : null;
  const shouldFail = failSet ? deduped.some((f) => failSet.has(f.severity)) : deduped.length > 0;
  return shouldFail ? 1 : 0;
}

const HELP = `etherhiding-detector v${VERSION}
Scan a repo for blockchain-hosted (EtherHiding/UNC5142) loaders and malicious code
injected into build configs — plus PolinRider repo-side tells (VS Code folder-open
tasks, fake-font payloads, force-push artifacts, JSON-appended loaders).

  node scan.js [path]              scan working tree (default: .)
  node scan.js --history [path]    also scan ref-reachable git history (configs + package.json)
  node scan.js --all-objects       forensic triage: scan EVERY git object, incl. dangling/
                                   orphaned (catches force-pushed payloads). slower; implies
                                   --history. pair with --fail-on=critical
  node scan.js --all [path]        scan all JS/TS files (not just build configs)
  node scan.js --signatures-only   known-IOC matches only (lowest false positives)
  node scan.js --fail-on=critical,high   exit nonzero only for these severities
  node scan.js --exclude=scan.js,vendor/ skip paths containing these substrings
  node scan.js --json | --quiet | --version | --help
  node scan.js [flags] -- <path>   argv terminator: everything after -- is a path

exit: 0 clean · 1 findings (subject to --fail-on) · 2 error. Never executes inspected code.`;

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { analyze, fileHashFinding, fakeFontFinding, shannon, KNOWN, CONFIG_RE };
