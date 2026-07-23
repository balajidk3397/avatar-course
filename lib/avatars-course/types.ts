export type LessonStatus = "published" | "stub";

export interface LessonVariables {
  characterName: string;
  characterRole: string;
  scenarioSetup: string;
  objectives: string[];
  openingLine: string;
  successCriteria: string;
  maxTurns: number;
}

export interface Lesson {
  id: string;
  scenarioId: string;
  order: number;
  title: string;
  description: string;
  status: LessonStatus;
  characterId: string;
  variables: LessonVariables | null;
}

export interface TurnHistoryEntry {
  speaker: "character" | "user";
  text: string;
}

export type Verdict = "correct" | "needs_correction" | "off_topic";

export interface EvaluationResult {
  verdict: Verdict;
  correctedText: string | null;
  characterReply: string;
  objectiveMet: string | null;
  advance: boolean;
  lessonComplete: boolean;
  starsIfComplete: 1 | 2 | 3 | null;
}
