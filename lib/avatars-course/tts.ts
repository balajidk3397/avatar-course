// Independent TTS client for avatars-course — deliberately does NOT reuse lib/tts.ts.
// That module caches blob URLs keyed only by text, which would collide across
// different character voices saying the same line. Own cache, own playback state.

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

let currentAudio: HTMLAudioElement | null = null;
let currentPlayPromise: Promise<void> | null = null;
let speakGeneration = 0;

function cacheKey(text: string, voiceId?: string): string {
  return `${voiceId ?? "default"}::${text}`;
}

async function fetchBlobUrl(text: string, voiceId?: string): Promise<string> {
  const key = cacheKey(text, voiceId);
  const inflight = pending.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(voiceId ? { text, voiceId } : { text }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("[avatars-course/tts] request failed", res.status, detail.slice(0, 100));
      throw new Error(`TTS failed: ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    cache.set(key, url);
    return url;
  })().finally(() => {
    pending.delete(key);
  });

  pending.set(key, promise);
  return promise;
}

export async function speakAs(text: string, voiceId?: string): Promise<void> {
  if (typeof window === "undefined") return;

  const gen = ++speakGeneration;

  currentAudio?.pause();
  currentAudio = null;
  currentPlayPromise = null;

  const key = cacheKey(text, voiceId);
  let url: string;
  try {
    url = cache.get(key) ?? (await fetchBlobUrl(text, voiceId));
  } catch (e) {
    console.error("[avatars-course/tts] could not get audio", e);
    return;
  }

  if (gen !== speakGeneration) return;

  return new Promise((resolve) => {
    const audio = new Audio(url);
    currentAudio = audio;

    audio.onended = () => {
      currentPlayPromise = null;
      resolve();
    };
    audio.onerror = (e) => {
      console.error("[avatars-course/tts] playback error", e);
      currentPlayPromise = null;
      resolve();
    };

    currentPlayPromise = audio.play().catch((e) => {
      if ((e as DOMException).name !== "AbortError") {
        console.error("[avatars-course/tts] play() rejected", e);
      }
      currentPlayPromise = null;
      resolve();
    });
  });
}

export async function stopSpeakingAs() {
  speakGeneration++;
  if (currentPlayPromise) {
    await currentPlayPromise.catch(() => {});
    currentPlayPromise = null;
  }
  currentAudio?.pause();
  currentAudio = null;
}
