import { z } from "zod";

export const EvaluationResultSchema = z.object({
  verdict: z.enum(["correct", "needs_correction", "off_topic"]),
  correctedText: z.string().nullable(),
  characterReply: z.string(),
  objectiveMet: z.string().nullable(),
  advance: z.boolean(),
  lessonComplete: z.boolean(),
  starsIfComplete: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
});

export const FALLBACK_EVALUATION = {
  verdict: "off_topic" as const,
  correctedText: null,
  characterReply: "Sorry, I didn't quite catch that — could you say it again?",
  objectiveMet: null,
  advance: false,
  lessonComplete: false,
  starsIfComplete: null,
};

export const TurnHistorySchema = z.array(
  z.object({
    speaker: z.enum(["character", "user"]),
    text: z.string(),
  })
);

export const RespondBodySchema = z.object({
  lessonId: z.string().min(1),
  transcript: z.string(),
  turnHistory: TurnHistorySchema,
  forceAdvance: z.boolean().optional(),
});
