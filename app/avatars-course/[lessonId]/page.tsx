"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createRecorder, type Recorder } from "@/lib/recorder";
import { speakAs, stopSpeakingAs } from "@/lib/avatars-course/tts";
import { useUser } from "@/app/user-context";
import { getLessonById } from "@/lib/avatars-course/course-data";
import { getRiveCharacter } from "@/lib/avatars-course/rive-config";
import { submitScenarioResult } from "@/lib/avatars-course/scenario-results";
import type { EvaluationResult, TurnHistoryEntry } from "@/lib/avatars-course/types";
import { RiveCharacter } from "@/components/avatars-course/RiveCharacter";
import { LessonHeader } from "@/components/avatars-course/LessonHeader";
import { MicButton } from "@/components/avatars-course/MicButton";
import { CorrectionPrompt } from "@/components/avatars-course/CorrectionPrompt";
import { LessonSummary } from "@/components/avatars-course/LessonSummary";

const MAX_CORRECTION_ATTEMPTS = 3;

function Waveform({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 24;
      const barWidth = 4;
      const gap = (canvas.width - barCount * barWidth) / (barCount + 1);
      const step = Math.floor(bufferLength / barCount);
      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255;
        const height = Math.max(4, value * canvas.height * 0.9);
        const x = gap + i * (barWidth + gap);
        const y = (canvas.height - height) / 2;
        ctx.fillStyle = `rgba(255,255,255,${0.4 + value * 0.6})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 2);
        ctx.fill();
      }
    };
    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={48}
      className="rounded-xl w-full max-w-[220px]"
      style={{ background: "rgba(255,255,255,0.06)" }}
    />
  );
}

type Stage =
  | "loading"
  | "character-speaking"
  | "listening"
  | "recording"
  | "transcribing"
  | "evaluating"
  | "complete"
  | "unavailable";

interface State {
  stage: Stage;
  currentLine: string;
  turnHistory: TurnHistoryEntry[];
  correctionAttempts: number;
  lastCorrectedText: string | null;
  pendingEmote: "correct" | "incorrect" | null;
  stars: 1 | 2 | 3;
  micError: string | null;
}

type Action =
  | { type: "STAGE"; stage: Stage }
  | { type: "OPEN"; line: string }
  | { type: "MIC_ERROR"; message: string }
  | { type: "CLEAR_MIC_ERROR" }
  | { type: "APPLY_EVALUATION"; userText: string; evaluation: EvaluationResult };

const initialState: State = {
  stage: "loading",
  currentLine: "",
  turnHistory: [],
  correctionAttempts: 0,
  lastCorrectedText: null,
  pendingEmote: null,
  stars: 1,
  micError: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "STAGE":
      return { ...state, stage: action.stage, micError: null };
    case "OPEN":
      return {
        ...state,
        stage: "character-speaking",
        currentLine: action.line,
        turnHistory: [{ speaker: "character", text: action.line }],
      };
    case "MIC_ERROR":
      return { ...state, micError: action.message, stage: "listening" };
    case "CLEAR_MIC_ERROR":
      return { ...state, micError: null };
    case "APPLY_EVALUATION": {
      const { userText, evaluation } = action;
      const newHistory: TurnHistoryEntry[] = [
        ...state.turnHistory,
        { speaker: "user", text: userText },
        { speaker: "character", text: evaluation.characterReply },
      ];
      const pendingEmote = evaluation.verdict === "correct" ? "correct" : "incorrect";

      if (evaluation.lessonComplete) {
        return {
          ...state,
          turnHistory: newHistory,
          stage: "complete",
          stars: evaluation.starsIfComplete ?? 1,
          pendingEmote,
          lastCorrectedText: null,
        };
      }

      if (evaluation.verdict === "correct" && evaluation.advance) {
        return {
          ...state,
          turnHistory: newHistory,
          stage: "character-speaking",
          currentLine: evaluation.characterReply,
          correctionAttempts: 0,
          lastCorrectedText: null,
          pendingEmote,
        };
      }

      return {
        ...state,
        turnHistory: newHistory,
        stage: "character-speaking",
        currentLine: evaluation.characterReply,
        correctionAttempts: state.correctionAttempts + 1,
        lastCorrectedText: evaluation.correctedText,
        pendingEmote,
      };
    }
    default:
      return state;
  }
}

export default function AvatarsCourseLessonPage() {
  const router = useRouter();
  const params = useParams<{ lessonId: string }>();
  const { auth } = useUser();

  const lesson = getLessonById(params.lessonId);
  const riveConfig = lesson ? getRiveCharacter(lesson.characterId) : undefined;

  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const recorderRef = useRef<Recorder | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const submittedRef = useRef(false);

  const cleanupRecorder = useCallback(() => {
    recorderRef.current?.cleanup();
    recorderRef.current = null;
    setAnalyser(null);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecorder();
      void stopSpeakingAs();
    };
  }, [cleanupRecorder]);

  // Open the lesson: play the opening line, then wait for the user.
  useEffect(() => {
    if (!lesson || !lesson.variables) return;
    dispatch({ type: "OPEN", line: lesson.variables.openingLine });
    // Only ever run once per lesson id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  // Whenever we enter "character-speaking", play the current line via TTS, then
  // move to "listening" once playback finishes.
  useEffect(() => {
    if (state.stage !== "character-speaking" || !state.currentLine) return;
    let cancelled = false;
    speakAs(state.currentLine, riveConfig?.voiceId).then(() => {
      if (!cancelled) dispatch({ type: "STAGE", stage: "listening" });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage, state.currentLine]);

  const handleClose = useCallback(() => {
    cleanupRecorder();
    void stopSpeakingAs();
    router.push("/avatars-course");
  }, [cleanupRecorder, router]);

  const handleMicPress = useCallback(async () => {
    if (state.stage === "listening") {
      await stopSpeakingAs();
      try {
        const rec = await createRecorder();
        recorderRef.current = rec;
        setAnalyser(rec.getAnalyser());
        await rec.start();
        dispatch({ type: "STAGE", stage: "recording" });
      } catch (e: unknown) {
        const code = (e as { code?: string }).code;
        const msg =
          code === "permission-denied"
            ? "Mic access needed to practice. Please allow microphone access and try again."
            : code === "not-supported"
            ? "Your browser doesn't support audio recording. Please try Chrome or Safari."
            : "Could not access microphone. Please try again.";
        dispatch({ type: "MIC_ERROR", message: msg });
      }
      return;
    }

    if (state.stage === "recording") {
      const rec = recorderRef.current;
      if (!rec || !lesson) return;
      const blob = await rec.stop();
      dispatch({ type: "STAGE", stage: "transcribing" });

      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      let transcript = "";
      try {
        const res = await fetch("/api/avatars-course/transcribe", { method: "POST", body: formData });
        const data = (await res.json()) as { transcript: string };
        transcript = data.transcript ?? "";
      } catch (e) {
        console.error("[avatars-course] transcribe error", e);
      }

      if (!transcript.trim()) {
        // Didn't catch anything — retry without burning a correction attempt.
        dispatch({
          type: "APPLY_EVALUATION",
          userText: "(inaudible)",
          evaluation: {
            verdict: "off_topic",
            correctedText: null,
            characterReply: "Sorry, I didn't catch that — could you say it again?",
            objectiveMet: null,
            advance: false,
            lessonComplete: false,
            starsIfComplete: null,
          },
        });
        return;
      }

      dispatch({ type: "STAGE", stage: "evaluating" });
      const cur = stateRef.current;
      const forceAdvance = cur.correctionAttempts >= MAX_CORRECTION_ATTEMPTS;
      try {
        const res = await fetch("/api/avatars-course/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson.id,
            transcript,
            turnHistory: cur.turnHistory,
            forceAdvance,
          }),
        });
        const evaluation = (await res.json()) as EvaluationResult;
        dispatch({ type: "APPLY_EVALUATION", userText: transcript, evaluation });
      } catch (e) {
        console.error("[avatars-course] respond error", e);
        dispatch({
          type: "APPLY_EVALUATION",
          userText: transcript,
          evaluation: {
            verdict: "off_topic",
            correctedText: null,
            characterReply: "Sorry, something went wrong — could you try again?",
            objectiveMet: null,
            advance: false,
            lessonComplete: false,
            starsIfComplete: null,
          },
        });
      }
    }
  }, [state.stage, lesson]);

  // Submit the result once the lesson completes.
  useEffect(() => {
    if (state.stage !== "complete" || !lesson || submittedRef.current) return;
    submittedRef.current = true;
    void submitScenarioResult(
      lesson.scenarioId,
      { data: { turnHistory: state.turnHistory }, stars: state.stars },
      auth
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stage]);

  if (!lesson || !lesson.variables) {
    return (
      <div className="flex flex-col h-full" style={{ background: "#07080F" }}>
        <LessonHeader onClose={() => router.push("/avatars-course")} turnLabel="" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-white/70">This lesson isn&apos;t ready yet.</p>
          <button onClick={() => router.push("/avatars-course")} className="text-white/40 text-sm active:opacity-70">
            Back to course
          </button>
        </div>
      </div>
    );
  }

  const isSpeaking = state.stage === "character-speaking";
  const isListening = state.stage === "listening" || state.stage === "recording";
  const turnLabel =
    state.stage === "transcribing" ? "Listening…" : state.stage === "evaluating" ? "Thinking…" : lesson.title;

  return (
    <div className="flex flex-col h-full" style={{ background: "#07080F" }}>
      <LessonHeader onClose={handleClose} turnLabel={turnLabel} />

      {state.stage === "complete" ? (
        <LessonSummary stars={state.stars} title={lesson.title} onContinue={() => router.push("/avatars-course")} />
      ) : (
        <div className="flex-1 flex flex-col items-center px-6 pt-6 gap-6">
          <RiveCharacter
            config={riveConfig}
            isSpeaking={isSpeaking}
            isListening={isListening}
            emote={state.stage === "character-speaking" ? state.pendingEmote : null}
          />

          <div
            className="w-full rounded-3xl p-5 min-h-[88px] flex items-center justify-center"
            style={{ background: "hsl(228 22% 13%)", border: "1px solid hsl(228 20% 22%)" }}
          >
            <p className="text-white text-lg font-medium text-center leading-snug">
              {state.stage === "transcribing"
                ? "Listening…"
                : state.stage === "evaluating"
                ? "Thinking…"
                : state.currentLine}
            </p>
          </div>

          {state.lastCorrectedText && state.stage === "character-speaking" && (
            <CorrectionPrompt correctedText={state.lastCorrectedText} />
          )}

          {state.micError && (
            <p className="text-red-400 text-sm text-center">{state.micError}</p>
          )}

          <div className="flex-1" />

          {(state.stage === "listening" || state.stage === "recording") && (
            <div className="pb-8 flex flex-col items-center gap-4">
              {state.stage === "recording" && <Waveform analyser={analyser} />}
              <MicButton
                state={state.stage === "recording" ? "recording" : "idle"}
                onPress={handleMicPress}
              />
            </div>
          )}
          {(state.stage === "transcribing" || state.stage === "evaluating") && (
            <div className="pb-8">
              <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
