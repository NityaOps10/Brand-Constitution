import { NextResponse } from "next/server";
import { callGemini, parseJson } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { choices, direction, kit } = await request.json();

    const prompt = `You are a minimalist logo designer. Design 3 DIFFERENT simple logo concepts
as raw SVG markup for this brand.

Brand name: ${choices.name}
Personality: ${JSON.stringify(direction.personality_traits)}
Palette (use ONLY these hex codes): ${JSON.stringify(kit.palette)}
Typography direction: ${kit.typography}

Rules for each SVG:
- viewBox="0 0 240 240", no fixed width/height attribute on the outer <svg> tag.
- Use ONLY single quotes for all attribute values inside the SVG string (never double quotes),
  so it can be safely embedded in JSON.
- No external images, no <script>, no <image>, no @import, no external fonts.
- font-family must be one of: sans-serif, serif, monospace (pick based on the typography direction).
- Each concept must be a genuinely different approach: e.g. one abstract geometric mark + wordmark,
  one monogram/lettermark, one simple icon that hints at the brand's category.
- Keep shapes simple (circles, paths, rects, polygons) — clean and scalable, not detailed illustration.
- The brand name should appear as readable text in at least 2 of the 3 concepts.

Return ONLY valid JSON in exactly this shape:
{
  "concepts": [
    { "name": "concept label, e.g. Geometric mark", "rationale": "one sentence why it fits", "svg": "<svg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'>...</svg>" },
    { "name": "...", "rationale": "...", "svg": "..." },
    { "name": "...", "rationale": "...", "svg": "..." }
  ]
}`;

    const out = parseJson(await callGemini(prompt));
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json(
      { error: "The AI is busy right now. Please try again in a moment.", details: String(e) },
      { status: 502 }
    );
  }
}