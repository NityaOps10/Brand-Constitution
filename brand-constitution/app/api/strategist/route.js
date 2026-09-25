import { NextResponse } from "next/server";
import { callGemini, parseJson } from "@/lib/gemini";

export const maxDuration = 60;

const LENSES = {
  editorial:
    "EDITORIAL: considered, literary, confident. Think independent magazine. Serif typography, restrained palette, generous whitespace, photography with a point of view.",
  playful:
    "PLAYFUL: warm, energetic, witty. Think a brand that feels like a friend. Rounded shapes, bold saturated color, hand-made details, humor used with purpose.",
  technical:
    "TECHNICAL: precise, systematic, credible. Think a well-built tool. Grid layouts, monospace accents, data-driven visuals, clear and direct language.",
};

export async function POST(request) {
  try {
    const { idea, understanding, qa, style } = await request.json();
    const lens = LENSES[style];
    if (!lens) {
      return NextResponse.json({ error: "Unknown style." }, { status: 400 });
    }

    const prompt = `You are a specialist brand strategist. Your lens is:
${lens}

Founder's idea: ${idea}
What we understood: ${JSON.stringify(understanding)}
Founder's answers to our follow-up questions: ${JSON.stringify(qa)}

Create ONE brand direction through your lens. Protect the same underlying value
proposition, but express it in a way that is clearly different from the other two lenses.

Anti-generic rules:
- Use specific details from the founder's answers, not generic startup language.
- Do NOT use words like: empower, seamless, revolutionize, unlock, next-generation.
- Do NOT suggest names ending in -ify, -ly, or -hub. Avoid blue-purple gradient looks.
- Every personality trait needs a reason tied to THIS audience.
- If you reference any competitor or existing product by name, it must be a REAL company that
  actually exists (consider both Indian-market players like Zomato, Swiggy, Licious and
  global/US players like DoorDash, Uber Eats, HelloFresh, Blue Apron, where relevant to the
  category). Never invent a fictional competitor. If unsure a name is real, describe the
  category instead of naming a company.
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
    const direction = parseJson(text);
    return NextResponse.json({ ...direction, style });
  } catch (e) {
    return NextResponse.json(
      { error: "The AI is busy right now. Please try again in a moment.", details: String(e) },
      { status: 502 }
    );
  }
}