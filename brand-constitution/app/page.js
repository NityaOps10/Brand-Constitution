"use client";
import { useState } from "react";
import Link from "next/link";

const STYLES = [
  { id: "editorial", label: "Editorial", bar: "bg-amber-700" },
  { id: "playful", label: "Playful", bar: "bg-rose-500" },
  { id: "technical", label: "Technical", bar: "bg-slate-800" },
];
const EXAMPLES = [
  "An app that helps students find teammates for projects",
  "A neighbourhood tool library where people lend and borrow things",
  "A meal delivery app for people who can't cook",
];
const STEPS = ["Your idea", "Interview", "Directions"];

const PIPELINE = [
  { n: 1, title: "Interview", desc: "Extracts the core problem, audience, and what's unclear. Asks 3 targeted follow-up questions before any branding starts." },
  { n: 2, title: "3 Rival Strategists", desc: "Editorial, Playful, and Technical strategists each draft an independent brand direction from the same brief, on purpose creating real disagreement." },
  { n: 3, title: "Critic", desc: "Scores each direction on audience fit, brief consistency, distinctiveness, and cliche risk. A separate non-AI scan also checks for banned buzzwords and generic name patterns." },
  { n: 4, title: "Revise (if needed)", desc: "Any direction scoring under 7/10 is rewritten using the critic's exact notes, then re-scored. The higher-scoring version is kept." },
  { n: 5, title: "Kit generation", desc: "Turns your chosen direction plus your picked name, tagline and notes into launch content: pitch, headline, voice rules, palette, and social captions." },
  { n: 6, title: "Consistency check", desc: "Re-reads the finished kit against the locked personality and flags anything that contradicts it, with one-click fixes." },
  { n: 7, title: "Guardian (ongoing)", desc: "Any new copy you write later is checked against the locked brand rules and voice, with violations and a rewrite." },
];

const scoreTone = (n) =>
  n >= 7 ? "bg-emerald-100 text-emerald-800" : n >= 5 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";

async function callApi(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      `${url} returned an error page (status ${res.status}). Check the terminal running npm run dev for the real error.`
    );
  }
  if (!res.ok) throw new Error(data.details || data.error || "Request failed");
  return data;
}

const Spinner = () => (
  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
);
const Label = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">{children}</p>
);
const DiscussSection = ({ section }) => (
  <Link
    href={`/collaborate?section=${encodeURIComponent(section)}`}
    className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
  >
    Discuss this section
  </Link>
);
const Field = ({ label, value, onChange, rows = 2 }) => (
  <div className="mt-4">
    <Label>{label}</Label>
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="mt-1 w-full resize-none rounded-xl border border-stone-200 bg-white/80 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
    />
  </div>
);

export default function Home() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [directions, setDirections] = useState([]);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showHow, setShowHow] = useState(false);

  const [pick, setPick] = useState({ name: "", tagline: "", note: "" });
  const [kit, setKit] = useState(null);
  const [check, setCheck] = useState(null);
  const [kitBusy, setKitBusy] = useState("");

  const [guardCopy, setGuardCopy] = useState("");
  const [guardResult, setGuardResult] = useState(null);
  const [guardBusy, setGuardBusy] = useState(false);

  const [logos, setLogos] = useState(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [deck, setDeck] = useState(null);
  const [deckBusy, setDeckBusy] = useState(false);
  const [slide, setSlide] = useState(0);
  const [moodSeed, setMoodSeed] = useState(() => Math.floor(Math.random() * 100000));

  const step = directions.length > 0 ? 3 : result ? 2 : 1;

  function reset() {
    setIdea(""); setKit(null); setCheck(null); setResult(null);
    setAnswers(["", "", ""]); setDirections([]);
    setError(""); setActive(0); setChosen(null); setProgress("");
    setGuardCopy(""); setGuardResult(null);
    setLogos(null); setDeck(null); setSlide(0);
    setMoodSeed(Math.floor(Math.random() * 100000));
  }

  async function startInterview() {
    setLoading(true); setError(""); setResult(null); setDirections([]); setChosen(null);
    setAnswers(["", "", ""]); setKit(null); setCheck(null);
    try {
      setResult(await callApi("/api/interview", { idea }));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function generateDirections() {
    setLoading(true); setError(""); setDirections([]); setActive(0); setChosen(null);
    setKit(null); setCheck(null);
    const qa = (result.questions || []).map((q, i) => ({
      question: q,
      answer: answers[i] || "(no answer given)",
    }));
    const base = { idea, understanding: result.understanding, qa };
    const collected = [];
    try {
      for (const s of STYLES) {
        setProgress(`${s.label} strategist is drafting...`);
        const draft = await callApi("/api/strategist", { ...base, style: s.id });
        setProgress(`Critic is reviewing the ${s.label} draft...`);
        const first = await callApi("/api/critic", { ...base, direction: draft });
        let finalDir = draft, finalCritique = first, revised = false;
        if (!first.passed) {
          setProgress(`Rewriting the ${s.label} draft from the critic's notes...`);
          const rewrite = await callApi("/api/revise", { ...base, direction: draft, critique: first });
          setProgress(`Critic is re-checking the ${s.label} rewrite...`);
          const second = await callApi("/api/critic", { ...base, direction: rewrite });
          if (second.overall >= first.overall) {
            finalDir = rewrite; finalCritique = second; revised = true;
          }
        }
        collected.push({ direction: finalDir, critique: finalCritique, first, revised });
        setDirections([...collected]);
      }
    } catch (e) {
      setError(e.message);
    }
    setProgress("");
    setLoading(false);
  }

  const getQa = () =>
    (result.questions || []).map((q, i) => ({ question: q, answer: answers[i] || "(no answer given)" }));

  function lockDirection(i) {
    const dd = directions[i].direction;
    setChosen(i);
    setPick({ name: dd.name_ideas?.[0]?.name || "", tagline: dd.tagline || "", note: "" });
    setKit(null);
    setCheck(null);
    setGuardCopy(""); setGuardResult(null);
    setLogos(null); setDeck(null); setSlide(0);
  }

  async function buildKit() {
    setError(""); setKit(null); setCheck(null);
    const dd = { ...directions[chosen].direction, tagline: pick.tagline };
    try {
      setKitBusy("Writing the brand kit and launch content...");
      const k = await callApi("/api/kit", {
        idea, understanding: result.understanding, qa: getQa(), direction: dd, choices: pick,
      });
      setKit(k);
      setKitBusy("Checking that everything feels like one brand...");
      setCheck(await callApi("/api/consistency", { direction: dd, choices: pick, kit: k }));
    } catch (e) {
      setError(e.message);
    }
    setKitBusy("");
  }

  function applyFixes() {
    const next = { ...kit };
    (check.conflicts || []).forEach((c) => {
      if (c.fixed_text && typeof next[c.field] === "string") next[c.field] = c.fixed_text;
    });
    setKit(next);
    setCheck({ ...check, applied: true });
  }

  async function checkGuardian() {
    setGuardBusy(true); setError(""); setGuardResult(null);
    try {
      const dd = directions[chosen].direction;
      const r = await callApi("/api/guardian", { direction: dd, choices: pick, kit, copy: guardCopy });
      setGuardResult(r);
    } catch (e) {
      setError(e.message);
    }
    setGuardBusy(false);
  }

  function moodPrompts() {
    const dd = directions[chosen]?.direction;
    const colors = (kit?.palette || []).map((c) => c.name).join(", ");
    const style = dd?.style || "";
    const trait = dd?.personality_traits?.[0]?.trait || "";
    const imagery = kit?.imagery || "";
    return [
      `${imagery}, ${colors} color palette, ${style} style, professional photography, no text`,
      `${pick.name} brand mood, ${trait} feeling, ${colors} tones, minimal composition, no text`,
      `${imagery}, ${style} aesthetic, soft natural lighting, no text no logo no watermark`,
    ];
  }

  async function generateLogos() {
    setLogoBusy(true); setError("");
    try {
      const dd = directions[chosen].direction;
      setLogos(await callApi("/api/logo", { choices: pick, direction: dd, kit }));
    } catch (e) {
      setError(e.message);
    }
    setLogoBusy(false);
  }

  async function generateDeck() {
    setDeckBusy(true); setError(""); setSlide(0);
    try {
      const dd = directions[chosen].direction;
      const r = await callApi("/api/deck", {
        idea, understanding: result.understanding, choices: pick, direction: dd, kit,
      });
      setDeck(r.slides);
    } catch (e) {
      setError(e.message);
    }
    setDeckBusy(false);
  }

  function kitMarkdown() {
    const dd = directions[chosen].direction;
    const L = (a) => (a || []).map((x) => `- ${x}`).join("\n");
    return `# ${pick.name} - Brand Kit

**Tagline:** ${pick.tagline}

**One-line pitch:** ${kit.one_line_pitch}

## Positioning
${dd.positioning}

**Value proposition:** ${dd.value_proposition}

## Personality
${(dd.personality_traits || []).map((t) => `- **${t.trait}:** ${t.why}`).join("\n")}

Avoid: ${(dd.traits_to_avoid || []).join(", ")}

## Voice
**Do**
${L(kit.voice_do)}

**Don't**
${L(kit.voice_dont)}

**Sample messages**
${L(kit.sample_messages)}

## Visual brief
${(kit.palette || []).map((c) => `- ${c.name} ${c.hex}: ${c.use}`).join("\n")}

**Typography:** ${kit.typography}

**Imagery:** ${kit.imagery}

**Logo direction:** ${kit.logo_direction}

**Avoid:** ${kit.visuals_avoid}

## Launch content
**Landing headline:** ${kit.headline}

${kit.subheadline}

**CTA:** ${kit.cta}

**Instagram caption**
${kit.instagram_caption}

**LinkedIn post**
${kit.linkedin_post}
`;
  }

  function downloadKit() {
    const blob = new Blob([kitMarkdown()], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(pick.name || "brand").toLowerCase().replace(/\s+/g, "-")}-brand-kit.md`;
    a.click();
  }

  function copySummary(d) {
    const t = `${d.tagline}\n\n${d.positioning}\n\nValue: ${d.value_proposition}\n\nNames: ${d.name_ideas?.map((n) => n.name).join(", ")}\n\nVoice: ${d.voice_sample}`;
    navigator.clipboard?.writeText(t);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const idx = Math.min(active, Math.max(directions.length - 1, 0));
  const cur = directions[idx];
  const d = cur?.direction;
  const btn = "rounded-xl px-5 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-stone-400";

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-amber-100 via-rose-100 to-sky-200 text-stone-900">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-orange-300/50 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-fuchsia-300/40 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-teal-300/40 blur-3xl" />
      </div>

      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/50 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 font-serif text-sm text-white">BC</span>
            <span className="font-serif text-lg font-semibold">Brand Constitution</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/collaborate"
              className="rounded-full border border-stone-300 bg-white/80 px-3 py-1.5 text-xs font-medium hover:bg-white">
              Collaborate
            </Link>
            <button onClick={() => setShowHow(!showHow)}
              className="rounded-full border border-stone-300 bg-white/80 px-3 py-1.5 text-xs font-medium hover:bg-white">
              {showHow ? "Hide pipeline" : "How this works"}
            </button>
            <ol className="hidden items-center gap-2 text-xs sm:flex">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${step > i + 1 ? "bg-emerald-600 text-white" : step === i + 1 ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-500"}`}>
                    {step > i + 1 ? "✓" : i + 1}
                  </span>
                  <span className={step === i + 1 ? "font-medium" : "text-stone-500"}>{s}</span>
                  {i < 2 && <span className="mx-1 h-px w-6 bg-stone-300" />}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </header>

      {showHow && (
        <div className="relative z-10 mx-auto max-w-4xl px-6 pt-6">
          <div className="rounded-2xl border border-stone-200 bg-white/85 p-6 shadow-sm">
            <h2 className="font-serif text-2xl font-semibold">The AI workflow</h2>
            <p className="mt-1 text-sm text-stone-600">
              Not one big prompt. Seven stages, each passing structured results to the next.
            </p>
            <div className="mt-5 space-y-3">
              {PIPELINE.map((p) => (
                <div key={p.n} className="flex gap-3 rounded-xl bg-stone-50 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
                    {p.n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{p.title}</p>
                    <p className="mt-0.5 text-xs text-stone-600">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-stone-500">
              Checks used: an AI critic scoring 4 dimensions, plus a separate deterministic scan
              (non-AI code) for banned buzzwords and generic naming patterns. Weak drafts are
              rewritten and re-scored automatically; the higher-scoring version is kept.
            </p>
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        {step === 1 ? (
          <section className="text-center">
            <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Turn a rough idea into a brand<br />you can actually enforce.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-stone-600">
              Three rival strategists draft directions, a critic tears them apart, and the best
              version survives.
            </p>
            <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe your idea in a sentence or two..."
                rows={3}
                className="w-full resize-none rounded-xl bg-stone-50 p-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => setIdea(ex)}
                      className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600 transition hover:border-stone-400 hover:text-stone-900">
                      {ex.length > 34 ? ex.slice(0, 34) + "…" : ex}
                    </button>
                  ))}
                </div>
                <button onClick={startInterview} disabled={loading || idea.trim().length < 5}
                  className={`${btn} flex items-center gap-2 bg-stone-900 text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40`}>
                  {loading && <Spinner />}{loading ? "Thinking..." : "Start the interview →"}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-white/75 p-4 shadow-sm">
            <div>
              <Label>Your idea</Label>
              <p className="mt-1 text-sm">{idea}</p>
            </div>
            <button onClick={reset} disabled={loading}
              className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium transition hover:bg-stone-100 disabled:opacity-40">
              Start over
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {result && step === 2 && (
          <div className="mt-6 space-y-6">
            <section className="grid gap-3 sm:grid-cols-3">
              {[
                ["Core problem", result.understanding?.core_problem],
                ["Likely audience", result.understanding?.likely_audience],
                ["Still unclear", result.understanding?.what_is_unclear],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-stone-200 bg-white/75 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>{k}</Label>
                    {k === "Likely audience" && <DiscussSection section="Target Audience" />}
                  </div>
                  <p className="mt-2 text-sm text-stone-700">{v}</p>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white/75 p-6 shadow-sm">
              <h2 className="font-serif text-2xl font-semibold">Before I suggest anything...</h2>
              <p className="mt-1 text-sm text-stone-500">A short, specific answer works better than a long general one — these shape three very different options next.</p>
              <div className="mt-5 space-y-5">
                {result.questions?.map((q, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium"><span className="mr-2 text-stone-400">{i + 1}.</span>{q}</p>
                    <textarea
                      value={answers[i] || ""}
                      onChange={(e) => { const n = [...answers]; n[i] = e.target.value; setAnswers(n); }}
                      rows={2}
                      placeholder="e.g. busy parents who order takeout three times a week"
                      className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white/80 p-3 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                    />
                  </div>
                ))}
              </div>
              <button onClick={generateDirections} disabled={loading}
                className={`${btn} mt-6 flex items-center gap-2 bg-stone-900 text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60`}>
                {loading && <Spinner />}{loading ? "Working..." : "Generate 3 rival directions →"}
              </button>
              {loading && progress && (
                <p className="mt-3 text-sm text-stone-500">{progress}</p>
              )}
            </section>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6">
            {loading && progress && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-stone-200 bg-white/85 p-4 text-sm shadow-sm">
                <Spinner /> <span>{progress}</span>
                <span className="ml-auto hidden text-xs text-stone-400 sm:inline">draft {"→"} critic {"→"} rewrite {"→"} re-check</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {directions.map((item, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${idx === i ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white/80 hover:border-stone-400"}`}>
                  <span className={`h-2 w-2 rounded-full ${STYLES.find((s) => s.id === item.direction.style)?.bar}`} />
                  <span className="capitalize">{item.direction.style}</span>
                  <span className="text-xs opacity-70">{item.critique.overall}</span>
                  {chosen === i && <span>{"✓"}</span>}
                </button>
              ))}
            </div>

            {cur && (
              <article className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white/85 shadow-sm">
                <div className={`h-1.5 ${STYLES.find((s) => s.id === d.style)?.bar}`} />
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-xl">
                      <Label>{d.style} direction</Label>
                      <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight">{d.tagline}</h2>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreTone(cur.critique.overall)}`}>
                      How strong is this? {cur.critique.overall}/10
                    </span>
                  </div>

                  {cur.revised && (
                    <p className="mt-4 inline-block rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                      Rewritten after critique: {cur.first.overall} {"→"} {cur.critique.overall}
                    </p>
                  )}

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>Positioning</Label>
                        <DiscussSection section="Positioning" />
                      </div>
                      <p className="mt-2 text-sm text-stone-700">{d.positioning}</p>
                    </div>
                    <div><Label>Value proposition</Label><p className="mt-2 text-sm text-stone-700">{d.value_proposition}</p></div>
                  </div>

                  <div className="mt-8">
                    <Label>Personality</Label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {d.personality_traits?.map((t, j) => (
                        <div key={j} className="rounded-xl bg-stone-50 p-3">
                          <span className="rounded-full bg-stone-900 px-2.5 py-0.5 text-xs font-medium text-white">{t.trait}</span>
                          <p className="mt-2 text-xs text-stone-600">{t.why}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-stone-500">Never: {d.traits_to_avoid?.join(" · ")}</p>
                  </div>

                  <div className="mt-8">
                    <Label>Name ideas</Label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {d.name_ideas?.map((n, j) => (
                        <div key={j} className="rounded-xl border border-stone-200 p-3">
                          <p className="font-serif text-lg font-semibold">{n.name}</p>
                          <p className="mt-1 text-xs text-stone-600">{n.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <Label>Brand Voice</Label>
                      <DiscussSection section="Brand Voice" />
                    </div>
                    <blockquote className="border-l-4 border-stone-300 pl-4 font-serif text-lg italic text-stone-700">
                      {d.voice_sample}
                    </blockquote>
                  </div>

                  <div className="mt-8">
                    <Label>Visual direction</Label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {[["Color", d.visual_direction?.color_mood], ["Type", d.visual_direction?.typography], ["Imagery", d.visual_direction?.imagery]].map(([k, v]) => (
                        <div key={k} className="rounded-xl bg-stone-50 p-3">
                          <p className="text-xs font-semibold">{k}</p>
                          <p className="mt-1 text-xs text-stone-600">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <details className="mt-8 rounded-xl border border-stone-200 p-4 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Why this scored the way it did {cur.revised ? "(first draft)" : ""}
                    </summary>
                    <p className="mt-3 text-stone-600">
                      Audience fit {cur.first.scores?.audience_fit} {"·"} Brief match {cur.first.scores?.brief_consistency} {"·"}
                      Distinctiveness {cur.first.scores?.distinctiveness} {"·"} Cliche risk {cur.first.scores?.cliche_risk}
                    </p>
                    {(cur.first.scan?.banned_words?.length > 0 || cur.first.scan?.cliche_names?.length > 0) && (
                      <p className="mt-2 text-stone-600">
                        <b>Automatic scan flagged:</b> {[...cur.first.scan.banned_words, ...cur.first.scan.cliche_names].join(", ")}
                      </p>
                    )}
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-stone-700">
                      {cur.first.problems?.map((p, j) => (
                        <li key={j}><b>{p.field}:</b> {p.issue} <i className="text-stone-500">Fix: {p.fix}</i></li>
                      ))}
                    </ul>
                  </details>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button onClick={() => lockDirection(idx)}
                      className={`${btn} ${chosen === idx ? "bg-emerald-600 text-white" : "bg-stone-900 text-white hover:bg-stone-700"}`}>
                      {chosen === idx ? "✓ Direction selected" : "Choose this direction"}
                    </button>
                    <button onClick={() => copySummary(d)}
                      className={`${btn} border border-stone-300 bg-white hover:bg-stone-100`}>
                      {copied ? "Copied!" : "Copy summary"}
                    </button>
                  </div>
                </div>
              </article>
            )}

            {chosen !== null && !loading && (
              <section className="mt-8 rounded-2xl border border-stone-200 bg-white/75 p-6 shadow-sm">
                <h2 className="font-serif text-2xl font-semibold">Shape your brand kit</h2>
                <p className="mt-1 text-sm text-stone-600">
                  You are in control. Pick the name, edit the tagline, add direction. The AI builds around your choices.
                </p>

                <div className="mt-5"><Label>Name</Label></div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {directions[chosen].direction.name_ideas?.map((n) => (
                    <button key={n.name} onClick={() => setPick({ ...pick, name: n.name })}
                      className={`rounded-full border px-4 py-1.5 text-sm transition ${pick.name === n.name ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white hover:border-stone-500"}`}>
                      {n.name}
                    </button>
                  ))}
                </div>
                <input value={pick.name} onChange={(e) => setPick({ ...pick, name: e.target.value })}
                  placeholder="...or type your own name"
                  className="mt-3 w-full rounded-xl border border-stone-200 bg-white/80 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300" />

                <Field label="Tagline" value={pick.tagline} onChange={(v) => setPick({ ...pick, tagline: v })} />
                <Field label="Anything to change or emphasize? (optional)" value={pick.note}
                  onChange={(v) => setPick({ ...pick, note: v })} />
                <p className="-mt-3 text-xs text-stone-400">e.g. "make it feel more premium" or "keep it simple, no jargon"</p>

                <button onClick={buildKit} disabled={!!kitBusy || !pick.name}
                  className={`${btn} mt-5 flex items-center gap-2 bg-stone-900 text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60`}>
                  {kitBusy && <Spinner />}{kitBusy ? "Working..." : kit ? "Rebuild the kit" : "Build my brand kit →"}
                </button>
                {kitBusy && <p className="mt-3 text-sm text-stone-500">{kitBusy}</p>}
              </section>
            )}

            {kit && (
              <section className="mt-6 rounded-2xl border border-stone-200 bg-white/75 p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Label>Brand kit</Label>
                    <h2 className="mt-1 font-serif text-3xl font-semibold">{pick.name}</h2>
                    <p className="font-serif italic text-stone-600">{pick.tagline}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={downloadKit} className={`${btn} bg-stone-900 text-white hover:bg-stone-700`}>
                      Download .md
                    </button>
                    <button onClick={() => { navigator.clipboard?.writeText(kitMarkdown()); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                      className={`${btn} border border-stone-300 bg-white hover:bg-stone-100`}>
                      {copied ? "Copied!" : "Copy all"}
                    </button>
                  </div>
                </div>

                {check && (
                  <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Does everything match?</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreTone(check.score)}`}>
                        {check.score}/10
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-600">{check.verdict}</p>
                    {check.scan?.length > 0 && (
                      <p className="mt-2 text-xs text-stone-500">Cliche words found: {check.scan.join(", ")}</p>
                    )}
                    {check.conflicts?.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-700">
                        {check.conflicts.map((c, i) => (
                          <li key={i}><b>{c.field}:</b> {c.issue}</li>
                        ))}
                      </ul>
                    )}
                    {check.conflicts?.some((c) => c.fixed_text) && !check.applied && (
                      <button onClick={applyFixes} className={`${btn} mt-3 bg-emerald-600 text-white hover:bg-emerald-700`}>
                        Apply suggested fixes
                      </button>
                    )}
                    {check.applied && <p className="mt-3 text-sm text-emerald-700">Fixes applied to the launch content below.</p>}
                  </div>
                )}

                <h3 className="mt-8 font-serif text-xl font-semibold">Launch content <span className="text-sm font-normal text-stone-500">(editable)</span></h3>
                <Field label="One-line pitch" value={kit.one_line_pitch} onChange={(v) => setKit({ ...kit, one_line_pitch: v })} />
                <Field label="Landing headline" value={kit.headline} onChange={(v) => setKit({ ...kit, headline: v })} />
                <Field label="Subheadline" value={kit.subheadline} onChange={(v) => setKit({ ...kit, subheadline: v })} />
                <Field label="Call to action" value={kit.cta} onChange={(v) => setKit({ ...kit, cta: v })} rows={1} />
                <Field label="Instagram caption" value={kit.instagram_caption} rows={4} onChange={(v) => setKit({ ...kit, instagram_caption: v })} />
                <Field label="LinkedIn post" value={kit.linkedin_post} rows={6} onChange={(v) => setKit({ ...kit, linkedin_post: v })} />

                <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-serif text-xl font-semibold">Voice</h3>
                  <DiscussSection section="Brand Voice" />
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs font-semibold text-emerald-900">DO</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{kit.voice_do?.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-4">
                    <p className="text-xs font-semibold text-rose-900">DON&apos;T</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{kit.voice_dont?.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {kit.sample_messages?.map((m, i) => (
                    <p key={i} className="rounded-xl border border-stone-200 bg-white p-3 font-serif text-sm italic">{m}</p>
                  ))}
                </div>

                <h3 className="mt-8 font-serif text-xl font-semibold">Visual brief</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {kit.palette?.map((c, i) => (
                    <div key={i} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                      <div className="h-16" style={{ backgroundColor: c.hex }} />
                      <div className="p-2">
                        <p className="text-xs font-semibold">{c.name}</p>
                        <p className="text-xs text-stone-500">{c.hex}</p>
                        <p className="mt-1 text-xs text-stone-600">{c.use}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[["Typography", kit.typography], ["Imagery", kit.imagery], ["Logo direction", kit.logo_direction], ["Avoid", kit.visuals_avoid]].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-stone-50 p-3">
                      <p className="text-xs font-semibold">{k}</p>
                      <p className="mt-1 text-xs text-stone-600">{v}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border border-stone-200 bg-white/80 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-xl font-semibold">Mood images</h3>
                      <p className="mt-1 text-sm text-stone-600">Real AI-generated images from your visual brief.</p>
                    </div>
                    <button onClick={() => setMoodSeed(Math.floor(Math.random() * 100000))}
                      className={`${btn} border border-stone-300 bg-white text-xs hover:bg-stone-100`}>
                      Regenerate
                    </button>
                  </div>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {moodPrompts().map((p, i) => (
                      <div key={`${moodSeed}-${i}`} className="relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                        <div className="absolute inset-0 flex animate-pulse items-center justify-center text-xs text-stone-400">
                          Generating...
                        </div>
                        <img
                          src={`https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=300&height=300&seed=${moodSeed + i}&nologo=true&model=turbo`}
                          alt={p}
                          loading="lazy"
                          className="relative h-full w-full object-cover opacity-0 transition-opacity duration-500"
                          onLoad={(e) => { e.currentTarget.style.opacity = "1"; }}
                          onError={(e) => { e.currentTarget.style.opacity = "0.15"; }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-stone-400">
                    Free generation via Pollinations — can take a few seconds, and occasionally an image won't load. Click Regenerate if so.
                  </p>
                </div>

                <div className="mt-10 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/80 p-5 sm:p-6">
                  <h3 className="font-serif text-xl font-semibold">Check new copy against your brand</h3>
                  <p className="mt-1 text-xs uppercase tracking-widest text-stone-400">Consistency Guardian</p>
                  <p className="mt-2 text-sm text-stone-600">
                    Paste anything you're about to publish — a tweet, a landing section, an email — and see if it still sounds like {pick.name || "your brand"}.
                  </p>
                  <textarea
                    value={guardCopy}
                    onChange={(e) => setGuardCopy(e.target.value)}
                    rows={4}
                    placeholder="Paste copy to check..."
                    className="mt-3 w-full resize-none rounded-xl border border-stone-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                  />
                  <button onClick={checkGuardian} disabled={guardBusy || guardCopy.trim().length < 3}
                    className={`${btn} mt-3 flex items-center gap-2 bg-stone-900 text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60`}>
                    {guardBusy && <Spinner />}{guardBusy ? "Checking..." : "Check this copy"}
                  </button>

                  {guardResult && (
                    <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">Does this still sound like {pick.name || "your brand"}?</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreTone(guardResult.score)}`}>
                          {guardResult.score}/10
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-stone-600">{guardResult.verdict}</p>

                      {guardResult.violations?.length > 0 ? (
                        <ul className="mt-3 space-y-2">
                          {guardResult.violations.map((v, i) => (
                            <li key={i} className="rounded-lg bg-rose-50 p-3 text-sm">
                              <p className="font-semibold text-rose-900">{v.rule}</p>
                              <p className="mt-1 text-rose-800">{v.issue}</p>
                              <p className="mt-1 italic text-rose-700">&quot;{v.quote}&quot;</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-emerald-700">No violations found — this fits the brand.</p>
                      )}

                      {guardResult.violations?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Suggested rewrite</p>
                          <p className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">{guardResult.rewrite}</p>
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => { navigator.clipboard?.writeText(guardResult.rewrite); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                              className={`${btn} border border-stone-300 bg-white text-xs hover:bg-stone-100`}>
                              {copied ? "Copied!" : "Copy rewrite"}
                            </button>
                            <button onClick={() => setGuardCopy(guardResult.rewrite)}
                              className={`${btn} border border-stone-300 bg-white text-xs hover:bg-stone-100`}>
                              Use as new input
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-10 rounded-2xl border border-stone-200 bg-white/80 p-5 sm:p-6">
                  <h3 className="font-serif text-xl font-semibold">Logo concepts</h3>
                  <p className="mt-1 text-sm text-stone-600">Three directions, generated from your palette and personality.</p>
                  <button onClick={generateLogos} disabled={logoBusy}
                    className={`${btn} mt-3 flex items-center gap-2 bg-stone-900 text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60`}>
                    {logoBusy && <Spinner />}{logoBusy ? "Designing..." : logos ? "Regenerate logos" : "Generate logo concepts"}
                  </button>

                  {logos?.concepts && (
                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                      {logos.concepts.map((c, i) => (
                        <div key={i} className="rounded-xl border border-stone-200 bg-white p-4">
                          <div className="flex aspect-square items-center justify-center rounded-lg bg-stone-50"
                            dangerouslySetInnerHTML={{ __html: c.svg }} />
                          <p className="mt-3 text-sm font-semibold">{c.name}</p>
                          <p className="mt-1 text-xs text-stone-600">{c.rationale}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-stone-200 bg-white/80 p-5 sm:p-6">
                  <h3 className="font-serif text-xl font-semibold">Pitch deck</h3>
                  <p className="mt-1 text-sm text-stone-600">A 6-slide outline built from your brand kit.</p>
                  <button onClick={generateDeck} disabled={deckBusy}
                    className={`${btn} mt-3 flex items-center gap-2 bg-stone-900 text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60`}>
                    {deckBusy && <Spinner />}{deckBusy ? "Building..." : deck ? "Regenerate deck" : "Generate pitch deck"}
                  </button>

                  {deck && (
                    <div className="mt-5">
                      <div className="flex aspect-video flex-col justify-center overflow-hidden rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
                        {deck[slide]?.layout === "cover" ? (
                          <div className="text-center">
                            <h2 className="font-serif text-3xl font-semibold">{deck[slide].title}</h2>
                            <p className="mt-3 text-stone-600">{deck[slide].subtitle}</p>
                          </div>
                        ) : deck[slide]?.layout === "visual" ? (
                          <div>
                            <h2 className="font-serif text-2xl font-semibold">{deck[slide].title}</h2>
                            <p className="mt-2 text-sm text-stone-600">{deck[slide].subtitle}</p>
                            <div className="mt-4 flex gap-2">
                              {kit.palette?.map((c, i) => (
                                <div key={i} className="h-10 w-10 rounded-full border border-stone-200" style={{ backgroundColor: c.hex }} />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h2 className="font-serif text-2xl font-semibold">{deck[slide]?.title}</h2>
                            <ul className="mt-4 space-y-2">
                              {deck[slide]?.bullets?.map((b, i) => (
                                <li key={i} className="flex gap-2 text-sm text-stone-700">
                                  <span className="text-stone-400">{"•"}</span>{b}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <button onClick={() => setSlide(Math.max(0, slide - 1))} disabled={slide === 0}
                          className={`${btn} border border-stone-300 bg-white text-xs disabled:opacity-30`}>
                          {"←"} Prev
                        </button>
                        <div className="flex gap-1.5">
                          {deck.map((_, i) => (
                            <button key={i} onClick={() => setSlide(i)}
                              className={`h-2 w-2 rounded-full ${i === slide ? "bg-stone-900" : "bg-stone-300"}`} />
                          ))}
                        </div>
                        <button onClick={() => setSlide(Math.min(deck.length - 1, slide + 1))} disabled={slide === deck.length - 1}
                          className={`${btn} border border-stone-300 bg-white text-xs disabled:opacity-30`}>
                          Next {"→"}
                        </button>
                      </div>
                      <p className="mt-2 text-center text-xs text-stone-400">
                        Slide {slide + 1} of {deck.length} {"·"} Use your browser's Print {"→"} Save as PDF to export
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}