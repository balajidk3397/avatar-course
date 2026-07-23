import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildTranscribePrompt } from "@/lib/avatars-course/prompt-template";

export async function POST(request: Request) {
  const start = Date.now();
  console.log("[avatars-course/transcribe] ── POST received ──────────────────────────");

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error("[avatars-course/transcribe] ✗ failed to parse formData", e);
    return Response.json({ transcript: "", error: "bad_request" });
  }

  const audio = formData.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    console.error("[avatars-course/transcribe] ✗ missing audio");
    return Response.json({ transcript: "", error: "missing_audio" });
  }

  const arrayBuffer = await audio.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = audio.type || "audio/webm";
  console.log("[avatars-course/transcribe] audio received —", Math.round(arrayBuffer.byteLength / 1024), "KB,", mimeType);

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      buildTranscribePrompt(),
    ]);

    const transcript = result.response.text().trim();
    console.log("[avatars-course/transcribe] ✓ transcript:", `"${transcript}"`, "in", Date.now() - start, "ms");
    return Response.json({ transcript });
  } catch (e) {
    console.error("[avatars-course/transcribe] ✗ Gemini error after", Date.now() - start, "ms:", e);
    return Response.json({ transcript: "", error: "gemini_error" });
  }
}
