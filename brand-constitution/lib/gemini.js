const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tries your preferred model first, retries once if overloaded,
// then falls back to other current models.
export async function callGemini(prompt) {
  const preferred = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const models = [...new Set([preferred, "gemini-3.8-flash", "gemini-3.5-flash-lite"])];
  let lastError = "";

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        return parts.map((p) => p.text ?? "").join("");
      }

      lastError = `${model} -> ${res.status}: ${await res.text()}`;
      if (res.status === 503 || res.status === 500) {
        await sleep(1500);
        continue;
      }
      break;
    }
  }
  throw new Error(lastError);
}

export function parseJson(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}