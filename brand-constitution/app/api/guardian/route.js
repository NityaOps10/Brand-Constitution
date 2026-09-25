import { NextResponse } from "next/server";
import { callGemini, parseJson } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { direction, choices, kit, copy } = await request.json();
    if (!copy || copy.trim().length < 3) {
      return NextResponse.json({ error: "Paste some copy to check." }, { status: 400 });
    }

    const prompt = `You are the Consistency Guardian for a locked brand. Your job is to check
whether NEW copy someone wrote fits the brand system, and fix it if it doesn't.

Brand name: ${choices.name}
Tagline: ${choices.tagline}
Positioning: ${direction.positioning}
Personality traits (must feel present): ${JSON.stringify(direction.personality_traits)}
Traits to avoid (must NEVER feel present): ${JSON.stringify(direction.traits_to_avoid)}
Voice DO rules: ${JSON.stringify(kit.voice_do)}
Voice DON'T rules: ${JSON.stringify(kit.voice_dont)}
Reference sample messages in this voice: ${JSON.stringify(kit.sample_messages)}

New copy submitted for review:
"""
${copy}
"""

Check it against the brand rules above. Be specific: point to which trait, which voice rule,
or which avoided trait is violated, not a vague "tone feels off."

Return ONLY valid JSON in exactly this shape:
{
  "score": 0,
  "verdict": "one sentence, direct",
  "violations": [
    { "rule": "the specific trait or voice rule broken", "issue": "what in the text breaks it", "quote": "the exact phrase from the copy that is the problem" }
  ],
  "rewrite": "the full corrected copy, same length roughly, fixing every violation while keeping the original intent"
}
Score 1-10, where 10 means it perfectly matches the brand and needs no changes.
If there are no real violations, return an empty violations array and make rewrite identical to the original copy.`;

    const out = parseJson(await callGemini(prompt));
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: "The AI is busy right now. Please try again in a moment.", details: String(e) },
      { status: 502 }
    );
  }
}