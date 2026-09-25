import { NextResponse } from "next/server";
import { callGemini, parseJson } from "@/lib/gemini";

export const maxDuration = 60;

const BANNED = ["empower", "seamless", "revolutionize", "unlock", "next-generation",
  "cutting-edge", "game-changing", "innovative", "leverage", "journey", "solution"];

export async function POST(request) {
  try {
    const { direction, choices, kit } = await request.json();
    const text = JSON.stringify(kit).toLowerCase();
    const banned_words = BANNED.filter((w) => text.includes(w));

    const prompt = `You are a strict brand consistency auditor.
Check whether the name, tagline, voice, visuals and launch copy feel like ONE brand.

Brand name: ${choices.name}
Tagline: ${choices.tagline}
Personality and rules: ${JSON.stringify({
      traits: direction.personality_traits,
      avoid: direction.traits_to_avoid,
      positioning: direction.positioning,
    })}
Kit to audit: ${JSON.stringify(kit, null, 2)}
Automatic scan found these cliche words: ${JSON.stringify(banned_words)}

Look for: tone that contradicts the personality, launch copy that ignores the voice rules,
a name or tagline that does not appear or clashes, visuals that fight the tone, cliches.
Be skeptical. Score cohesion 1-10 (most kits deserve 5-8).

Return ONLY valid JSON in exactly this shape:
{
  "score": 0,
  "verdict": "one sentence",
  "conflicts": [
    { "field": "one_line_pitch | headline | subheadline | cta | instagram_caption | linkedin_post | other",
      "issue": "what is inconsistent",
      "fixed_text": "the corrected full text for that field, or an empty string if field is other" }
  ]
}
List at most 4 conflicts. Return an empty list if the kit is truly consistent.`;

    const out = parseJson(await callGemini(prompt));
    const penalty = Math.min(2, 0.5 * banned_words.length);
    const score = Math.max(0, Math.round((Number(out.score) - penalty) * 10) / 10);
    return NextResponse.json({ ...out, score, scan: banned_words });
  } catch (e) {
    return NextResponse.json(
      { error: "The AI is busy right now. Please try again in a moment.", details: String(e) },
      { status: 502 }
    );
  }
}