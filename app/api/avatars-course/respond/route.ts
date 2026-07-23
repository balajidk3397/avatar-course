import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLessonById } from "@/lib/avatars-course/course-data";
import { buildRespondSystemPrompt } from "@/lib/avatars-course/prompt-template";
import { EvaluationResultSchema, FALLBACK_EVALUATION, RespondBodySchema } from "@/lib/avatars-course/schemas";

export async function POST(request: Request) {
  const start = Date.now();
  console.log("[avatars-course/respond] ── POST received ──────────────────────────");

  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    console.error("[avatars-course/respond] ✗ invalid JSON body", e);
    return Response.json(FALLBACK_EVALUATION);
  }

  const parsed = RespondBodySchema.safeParse(body);
  if (!parsed.success) {
    console.error("[avatars-course/respond] ✗ schema invalid", parsed.error.flatten());
    return Response.json(FALLBACK_EVALUATION);
  }

  const { lessonId, transcript, turnHistory, forceAdvance } = parsed.data;

  // Lesson content (objectives, rubric, persona) is looked up server-side by id —
  // never trust a client-supplied prompt/rubric, that would let the client rewrite
  // the grading criteria.
  const lesson = getLessonById(lessonId);
  if (!lesson || !lesson.variables) {
    console.error("[avatars-course/respond] ✗ unknown or unpublished lesson:", lessonId);
    return Response.json(FALLBACK_EVALUATION);
  }

  const prompt = buildRespondSystemPrompt(lesson, turnHistory, transcript, forceAdvance);

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const result = await model.generateContent(prompt);
    const geminiMs = Date.now() - start;
    const text = result.response.text().trim();
    console.log("[avatars-course/respond] Gemini responded in", geminiMs, "ms");
    console.log("[avatars-course/respond] raw response:", text.slice(0, 300));

    const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const evalParsed = EvaluationResultSchema.safeParse(JSON.parse(json));

    if (!evalParsed.success) {
      console.error("[avatars-course/respond] ✗ schema parse failed:", evalParsed.error.flatten());
      return Response.json(FALLBACK_EVALUATION);
    }

    console.log("[avatars-course/respond] ✓ verdict:", evalParsed.data.verdict, "| advance:", evalParsed.data.advance);
    return Response.json(evalParsed.data);
  } catch (e) {
    console.error("[avatars-course/respond] ✗ Gemini error after", Date.now() - start, "ms:", e);
    return Response.json(FALLBACK_EVALUATION);
  }
}
