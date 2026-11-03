// Viseme names are the timeline-animation names inside public/rive-avatars/nova.riv
// (taken from nova-viseme-words.vercel.app). Nova has no state machine: we play
// IDLE_ANIMATION on a loop and swap in one mouth-shape animation at a time.

export const IDLE_ANIMATION = "Idle neutral";
export const NEUTRAL = "Neutral";

export const VISEMES = [
  "Neutral", "B,P,M", "F,V", "th", "S,Z", "sh tsh zh", "kgn", "L",
  "i", "Ee", "ae", "a", "Aa", "Uu", "Oo", "OL",
] as const;

export interface VisemeCue {
  start: number; // seconds
  end: number;
  viseme: string;
}

// English grapheme → viseme. Digraphs are matched before single letters.
const DIGRAPHS: Record<string, string> = {
  th: "th", sh: "sh tsh zh", ch: "sh tsh zh", ph: "F,V", ng: "kgn", ck: "kgn", qu: "Uu",
  ee: "i", ea: "i", oo: "Uu", ou: "Oo", ow: "Oo", oa: "Oo", ai: "Ee", ay: "Ee", ey: "Ee",
  au: "Aa", aw: "Aa", oi: "OL", oy: "OL",
};
const LETTERS: Record<string, string> = {
  b: "B,P,M", p: "B,P,M", m: "B,P,M", f: "F,V", v: "F,V", s: "S,Z", z: "S,Z", x: "S,Z",
  j: "sh tsh zh", c: "kgn", k: "kgn", g: "kgn", n: "kgn", t: "kgn", d: "kgn", q: "kgn",
  l: "L", r: "L", w: "Uu", y: "i", h: "a",
  a: "ae", e: "Ee", i: "i", o: "Oo", u: "Uu",
};

/** Approximate viseme sequence for a line of English text (no timing). */
function textToVisemes(text: string): string[] {
  const out: string[] = [];
  const words = text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  words.forEach((word, wi) => {
    for (let i = 0; i < word.length; ) {
      const pair = word.slice(i, i + 2);
      if (DIGRAPHS[pair]) {
        out.push(DIGRAPHS[pair]);
        i += 2;
      } else {
        out.push(LETTERS[word[i]] ?? NEUTRAL);
        i += 1;
      }
    }
    if (wi < words.length - 1) out.push(NEUTRAL); // brief closure between words
  });
  return out;
}

/**
 * Spread the viseme sequence evenly across the audio duration. Not phoneme-accurate
 * (the TTS API returns no alignment), but reads as lip-sync at conversational pace.
 * Consecutive duplicates are merged so the mouth doesn't re-trigger the same shape.
 */
export function buildCues(text: string, durationSec: number): VisemeCue[] {
  const seq = textToVisemes(text).filter((v, i, a) => i === 0 || v !== a[i - 1]);
  if (!seq.length || !isFinite(durationSec) || durationSec <= 0) return [];
  const step = durationSec / seq.length;
  return seq.map((viseme, i) => ({ start: i * step, end: (i + 1) * step, viseme }));
}

export function visemeAt(cues: VisemeCue[], t: number): string {
  for (const c of cues) {
    if (t < c.start) break;
    if (t < c.end) return c.viseme;
  }
  return NEUTRAL;
}
