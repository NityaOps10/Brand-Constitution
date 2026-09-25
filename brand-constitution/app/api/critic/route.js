import { NextResponse } from "next/server";
import { callGemini, parseJson } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { idea, understanding, qa, direction } = await request.json();

    if (!direction) {
      return NextResponse.json({ error: "Missing direction to critique." }, { status: 400 });
    }

    const prompt = `You are a ruthless but fair brand critic.
Review this brand direction as if you are a lead strategist evaluating whether it is strong enough to launch.

Founder idea: ${idea}
What we understood: ${JSON.stringify(understanding)}
Founder answers: ${JSON.stringify(qa)}
Direction to review: ${JSON.stringify(direction, null, 2)}

Your job:
- Judge overall quality from 1 to 10.
- Decide whether it passes (true) or needs revision (false).
- Flag the biggest problems and give clear notes.
- Be honest about weak naming, vague positioning, generic language, or a mismatch with the audience.
- Keep the feedback specific and useful.

Return ONLY valid JSON in exactly this shape:
{
  "overall": 0,
  "passed": true,
  "summary": "one sentence",
  "issues": ["issue 1", "issue 2", "issue 3"]
}

Quality bar:
- 8+ = strong enough to move forward
- 5-7 = promising but needs refinement
- Below 5 = not ready and should be rewritten
`;

    const text = await callGemini(prompt);
    const review = parseJson(text);
    return NextResponse.json({
      overall: Number(review.overall ?? 0),
      passed: Boolean(review.passed ?? false),
      summary: review.summary ?? "Needs refinement.",
      issues: Array.isArray(review.issues) ? review.issues : [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: "The AI is busy right now. Please try again in a moment.", details: String(e) },
      { status: 502 }
    );
  }
}
