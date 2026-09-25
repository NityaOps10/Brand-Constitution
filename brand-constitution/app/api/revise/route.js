import { NextResponse } from "next/server";
import { callGemini, parseJson } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { idea, understanding, qa, direction, critique } = await request.json();

    if (!direction) {
      return NextResponse.json({ error: "Missing direction to revise." }, { status: 400 });
    }

    const prompt = `You are a senior brand strategist rewriting a direction based on direct critique.
Keep the original idea intact, but fix the weak spots.

Founder idea: ${idea}
What we understood: ${JSON.stringify(understanding)}
Founder answers: ${JSON.stringify(qa)}
Original direction: ${JSON.stringify(direction, null, 2)}
Critique notes: ${JSON.stringify(critique, null, 2)}

Fix the problems in the critique while preserving the strongest qualities.
Do NOT invent a completely different business.
Keep the brand grounded in the founder's real opportunity.

Anti-generic rules:
- Do NOT use words like: empower, seamless, revolutionize, unlock, next-generation.
- Do NOT suggest names ending in -ify, -ly, or -hub. Avoid blue-purple gradient looks.
- Every personality trait needs a reason tied to THIS audience.
- Make the direction feel sharper, more specific, and more believable.

Return ONLY valid JSON in exactly this shape:
{
  "positioning": "one sentence: for whom, what category, why different",
  "value_proposition": "one sentence",
  "personality_traits": [
    { "trait": "word", "why": "reason tied to the audience" },
    { "trait": "word", "why": "reason tied to the audience" },
    { "trait": "word", "why": "reason tied to the audience" }
  ],
  "traits_to_avoid": ["word", "word"],
  "name_ideas": [
    { "name": "Name", "rationale": "why it fits" },
    { "name": "Name", "rationale": "why it fits" },
    { "name": "Name", "rationale": "why it fits" }
  ],
  "tagline": "short tagline",
  "voice_sample": "a 2-sentence sample message in this brand's voice",
  "visual_direction": {
    "color_mood": "colors and the feeling they create",
    "typography": "type style and why",
    "imagery": "image style and what to avoid"
  }
}`;

    const text = await callGemini(prompt);
    const revised = parseJson(text);
    return NextResponse.json({ ...revised, style: direction.style || "editorial" });
  } catch (e) {
    return NextResponse.json(
      { error: "The AI is busy right now. Please try again in a moment.", details: String(e) },
      { status: 502 }
    );
  }
}
