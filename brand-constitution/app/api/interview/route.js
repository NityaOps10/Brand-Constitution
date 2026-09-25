import { NextResponse } from "next/server";
import { callGemini, parseJson } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { idea } = await request.json();
    if (!idea || idea.trim().length < 5) {
      return NextResponse.json({ error: "Please describe your idea." }, { status: 400 });
    }

    const prompt = `You are a sharp brand strategist interviewing a founder.
Do NOT start branding yet. First understand the idea.

Return ONLY valid JSON in exactly this shape:
{
  "understanding": {
    "core_problem": "one sentence",
    "likely_audience": "one sentence",
    "what_is_unclear": "one sentence"
  },
  "questions": ["question 1", "question 2", "question 3"]
}

Rules for the 3 questions:
- Ask about what is genuinely vague or missing in THIS idea.
- Prefer questions that would change the brand direction (audience, differentiation, feeling).
- No generic questions like "what is your budget?".
- If you ask about competitors or existing alternatives, you MUST reference only REAL companies
  that actually exist in the market today. Consider both the Indian market (e.g. Zomato, Swiggy,
  Licious) and the global/US market (e.g. DoorDash, Uber Eats, HelloFresh, Blue Apron) where
  relevant to the idea's category. Never invent a fictional competitor name. If you are unsure
  whether a company is real, do not mention it by name — describe the category instead.
Founder's idea: ${idea}`;

    const text = await callGemini(prompt);
    return NextResponse.json(parseJson(text));
  } catch (e) {
    return NextResponse.json(
      { error: "The AI is busy right now. Please try again in a moment.", details: String(e) },
      { status: 502 }
    );
  }
}