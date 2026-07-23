import type { Lesson, TurnHistoryEntry } from "./types";

export function buildTranscribePrompt(): string {
  return `Transcribe exactly what is said in this audio clip. The speaker is a learner practicing spoken English — transcribe their words as-is, including any grammar mistakes, do not correct or clean them up. Return ONLY the transcript text, no commentary, no quotes, no punctuation guessing beyond what's clearly spoken. If the audio is silent or unintelligible, return an empty string.`;
}

function formatHistory(history: TurnHistoryEntry[]): string {
  if (!history.length) return "(this is the first turn)";
  return history.map((h) => `${h.speaker === "character" ? "Character" : "Learner"}: ${h.text}`).join("\n");
}

export function buildRespondSystemPrompt(
  lesson: Lesson,
  turnHistory: TurnHistoryEntry[],
  transcript: string,
  forceAdvance = false
): string {
  const v = lesson.variables;
  if (!v) {
    throw new Error(`buildRespondSystemPrompt called for a lesson with no variables: ${lesson.id}`);
  }

  const forceAdvanceNote = forceAdvance
    ? `\nOVERRIDE: The learner has struggled with this objective across several attempts. Regardless of grammar, treat this turn as satisfying the current objective — be warm and encouraging, do not point out further mistakes, and either move to the next objective or complete the lesson. Set "verdict" to "correct" and "advance" to true.\n`
    : "";

  return `You are role-playing as ${v.characterName}, ${v.characterRole}, inside a spoken-English practice app for learners.
${forceAdvanceNote}

SCENE: ${v.scenarioSetup}

OBJECTIVES for this conversation, in order, each must be satisfied by something the learner says before the lesson is complete:
${v.objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}

CONVERSATION SO FAR:
${formatHistory(turnHistory)}

The learner just said (transcribed from their voice, may contain mistakes):
"${transcript}"

YOUR JOB:
STEP 1 — Decide a verdict for what the learner just said:
   - "correct": grammatically correct AND clearly addresses the next unmet objective.
   - "needs_correction": addresses the objective but has a clear grammar mistake (wrong verb form, missing subject, wrong tense, etc.) — minor accent-only quirks in the transcript do NOT count as a grammar mistake.
   - "off_topic": doesn't address the current objective at all (silence, unrelated statement, confusion).

Scoring rubric: ${v.successCriteria}

STEP 2 — Respond in character as ${v.characterName}:
   - If "correct": acknowledge warmly and either ask the next unmet objective's question, or if this was the last objective, give a short congratulatory closing line.
   - If "needs_correction": gently and briefly correct the learner's grammar in-character (model the fixed sentence), then ask them to try answering the same question again. Keep it encouraging, not a lecture.
   - If "off_topic": gently re-ask the current objective's question in a natural, in-character way.

STEP 3 — Set "advance" to true only if verdict is "correct" AND every objective has now been satisfied by this or a prior turn, OR if verdict is "correct" and there are still unmet objectives (advance to the next objective). Set "advance" to false if verdict is "needs_correction" or "off_topic" (the learner should retry the same objective).

STEP 4 — Set "lessonComplete" to true only once every objective has been satisfied. When true, set "starsIfComplete": 3 if every objective was met on the first try with no corrections needed anywhere in the conversation, 2 if there were one or two corrections total, 1 if there were three or more corrections. When "lessonComplete" is false, "starsIfComplete" must be null.

Respond with ONLY valid JSON (no markdown, no extra text), exactly this shape:
{"verdict": "correct"|"needs_correction"|"off_topic", "correctedText": "<corrected version of what the learner said, or null if verdict is correct>", "characterReply": "<what ${v.characterName} says next, in character>", "objectiveMet": "<the objective text just satisfied, or null>", "advance": <boolean>, "lessonComplete": <boolean>, "starsIfComplete": <1|2|3|null>}`;
}
