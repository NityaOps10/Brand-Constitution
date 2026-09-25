import { NextResponse } from "next/server";
import { callGemini, parseJson } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { idea, understanding, choices, direction, kit } = await request.json();

    const prompt = `Turn this brand into a lean 6-slide pitch deck outline. Be concrete and specific
to this brand, not generic startup-deck language.

Idea: ${idea}
Understanding: ${JSON.stringify(understanding)}
Brand name: ${choices.name}
Tagline: ${choices.tagline}
Positioning: ${direction.positioning}
Value proposition: ${direction.value_proposition}
Personality: ${JSON.stringify(direction.personality_traits)}
One-line pitch: ${kit.one_line_pitch}
Headline: ${kit.headline}

Return ONLY valid JSON, exactly 6 slides in this order and shape:
{
  "slides": [
    { "layout": "cover", "title": "${choices.name}", "subtitle": "the tagline or one-line pitch" },
    { "layout": "content", "title": "The problem", "bullets": ["bullet", "bullet", "bullet"] },
    { "layout": "content", "title": "The solution", "bullets": ["bullet", "bullet", "bullet"] },
    { "layout": "content", "title": "Why ${choices.name}", "bullets": ["differentiator bullet", "differentiator bullet", "differentiator bullet"] },
    { "layout": "visual", "title": "Brand identity", "subtitle": "one sentence tying personality to the visual direction" },
    { "layout": "content", "title": "Get started", "bullets": ["call to action bullet", "bullet", "bullet"] }
  ]
}
Keep every bullet under 12 words. No filler like "we are excited to."`;

    const out = parseJson(await callGemini(prompt));
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: "The AI is busy right now. Please try again in a moment.", details: String(e) },
      { status: 502 }
    );
  }
}