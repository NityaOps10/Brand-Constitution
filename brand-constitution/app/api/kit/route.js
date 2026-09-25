import { NextResponse } from "next/server";
import { callGemini, parseJson } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { idea, understanding, qa, direction, choices } = await request.json();

    const prompt = `You are a senior brand strategist turning a chosen brand direction into a launch-ready kit.

Founder's idea: ${idea}
What we understood: ${JSON.stringify(understanding)}
Founder's answers: ${JSON.stringify(qa)}
Chosen direction: ${JSON.stringify(direction, null, 2)}

The founder made these decisions. Obey them exactly:
- Brand name: ${choices.name}
- Tagline: ${choices.tagline}
- Extra direction: ${choices.note || "(none)"}

Rules:
- Everything must sound like ONE brand with the personality traits above and never show the traits_to_avoid.
- Be specific to this audience. Do NOT use: empower, seamless, revolutionize, unlock, next-generation, cutting-edge, journey, solution.
- Palette: 4 colors with real hex codes that match the color mood.

Return ONLY valid JSON in exactly this shape:
{
  "one_line_pitch": "one sentence",
  "headline": "landing-page headline",
  "subheadline": "one or two sentences",
  "cta": "button text, max 4 words",
  "voice_do": ["rule", "rule", "rule"],
  "voice_dont": ["rule", "rule", "rule"],
  "sample_messages": ["message 1", "message 2", "message 3"],
  "instagram_caption": "launch caption, 3-4 lines, in the brand voice",
  "linkedin_post": "launch post, 5-7 lines, in the brand voice",
  "palette": [ { "name": "color name", "hex": "#RRGGBB", "use": "where to use it" } ],
  "typography": "font pairing and why",
  "imagery": "photo or illustration style",
  "logo_direction": "symbol and wordmark concept",
  "visuals_avoid": "what to avoid visually"
}`;

    const text = await callGemini(prompt);
    return NextResponse.json(parseJson(text));
  } catch (e) {
    return NextResponse.json(
      { error: "The AI is busy right now. Please try again in a moment.", details: String(e) },
      { status: 502 }
    );
  }
}