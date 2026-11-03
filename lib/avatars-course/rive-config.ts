export interface RiveCharacterConfig {
  src: string;
  artboard?: string;
  /**
   * "state-machine" (default): driven by boolean/trigger inputs.
   * "viseme": a lip-sync character (e.g. Nova) with one timeline animation per
   * mouth shape — see components/avatars-course/VisemeCharacter.tsx.
   */
  kind?: "state-machine" | "viseme";
  stateMachine: string;
  inputs: {
    speaking?: string;
    listening?: string;
    correct?: string;
    incorrect?: string;
  };
  fallbackEmoji: string;
  fallbackColor: string;
  voiceId?: string;
}

// Artboard "Character" + state machine "InLesson" were confirmed by loading these
// two files directly (headless introspection) — same asset pack, consistent naming.
// The other four .riv files are unverified (same pack, naming assumed to match) —
// RiveCharacter's guarded input lookups degrade silently if a name is wrong, see
// components/avatars-course/RiveCharacter.tsx.
const CONFIRMED_ARTBOARD = "Character";
const CONFIRMED_STATE_MACHINE = "InLesson";
const GUESSED_INPUTS = {
  speaking: "isSpeaking",
  listening: "isListening",
  correct: "correct",
  incorrect: "incorrect",
};

export const RIVE_CHARACTERS: Record<string, RiveCharacterConfig> = {
  // Nova — lip-sync character from nova-viseme-words.vercel.app. No state machine:
  // plays "Idle neutral" looped, and one animation per viseme (see lib/avatars-course/visemes.ts).
  nova: {
    src: "/rive-avatars/nova.riv",
    kind: "viseme",
    stateMachine: "",
    inputs: {},
    fallbackEmoji: "🌟",
    fallbackColor: "hsl(258 90% 66%)",
  },
  "notion-mascot": {
    src: "/rive-avatars/mascot-notionpeople_gesture.riv",
    artboard: CONFIRMED_ARTBOARD,
    stateMachine: CONFIRMED_STATE_MACHINE,
    inputs: GUESSED_INPUTS,
    fallbackEmoji: "🙂",
    fallbackColor: "hsl(258 90% 66%)",
  },
  "cat-mascot": {
    src: "/rive-avatars/v2mascot-cat.riv",
    artboard: CONFIRMED_ARTBOARD,
    stateMachine: CONFIRMED_STATE_MACHINE,
    inputs: GUESSED_INPUTS,
    fallbackEmoji: "🐱",
    fallbackColor: "hsl(30 90% 60%)",
  },
  "retrobot-mascot": {
    src: "/rive-avatars/v4mascot_retrobot.riv",
    artboard: CONFIRMED_ARTBOARD,
    stateMachine: CONFIRMED_STATE_MACHINE,
    inputs: GUESSED_INPUTS,
    fallbackEmoji: "🤖",
    fallbackColor: "hsl(200 90% 55%)",
  },
  "adam-mascot": {
    src: "/rive-avatars/v_fin_mascotbot_adam_no_bg.riv",
    artboard: CONFIRMED_ARTBOARD,
    stateMachine: CONFIRMED_STATE_MACHINE,
    inputs: GUESSED_INPUTS,
    fallbackEmoji: "🤖",
    fallbackColor: "hsl(150 70% 45%)",
  },
  "office-girl": {
    src: "/rive-avatars/office-girl-1.0.0.riv",
    artboard: CONFIRMED_ARTBOARD,
    stateMachine: CONFIRMED_STATE_MACHINE,
    inputs: GUESSED_INPUTS,
    fallbackEmoji: "👩‍💼",
    fallbackColor: "hsl(340 80% 60%)",
  },
  "cyberpunk-girl": {
    src: "/rive-avatars/cyber-punk-girl.riv",
    artboard: CONFIRMED_ARTBOARD,
    stateMachine: CONFIRMED_STATE_MACHINE,
    inputs: GUESSED_INPUTS,
    fallbackEmoji: "🦾",
    fallbackColor: "hsl(280 90% 60%)",
  },
};

export function getRiveCharacter(characterId: string): RiveCharacterConfig | undefined {
  return RIVE_CHARACTERS[characterId];
}
