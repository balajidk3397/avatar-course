"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Fit, Layout, useRive } from "@rive-app/react-canvas";
import type { RiveCharacterConfig } from "@/lib/avatars-course/rive-config";
import { IDLE_ANIMATION, NEUTRAL, buildCues, visemeAt } from "@/lib/avatars-course/visemes";

interface VisemeCharacterProps {
  config: RiveCharacterConfig;
  audio: HTMLAudioElement | null;
  text: string;
  size?: number;
  variant?: "circle" | "hero";
}

// Minimum gap between mouth-shape swaps, same throttle as the Nova demo page —
// faster than this just flickers.
const MIN_SWAP_MS = 55;

export function VisemeCharacter({ config, audio, text, size = 160, variant = "circle" }: VisemeCharacterProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const { rive, RiveComponent } = useRive({
    src: config.src,
    animations: [IDLE_ANIMATION, NEUTRAL],
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain }),
    onLoadError: () => {
      console.warn("[VisemeCharacter] failed to load .riv asset:", config.src);
      setLoadFailed(true);
    },
  });

  const currentRef = useRef<string>(NEUTRAL);
  const cuesRef = useRef<ReturnType<typeof buildCues>>([]);
  const cueKey = useMemo(() => text, [text]);

  // Drive the mouth from the audio clock while a line is playing.
  useEffect(() => {
    if (!rive || !audio) return;
    let raf = 0;
    let lastSwap = -Infinity;

    const setViseme = (next: string) => {
      const prev = currentRef.current;
      if (next === prev) return;
      try {
        if (prev !== NEUTRAL) rive.stop(prev);
        rive.play(next);
      } catch (e) {
        console.warn("[VisemeCharacter] setViseme error", e);
      }
      currentRef.current = next;
    };

    const tick = () => {
      if (cuesRef.current.length === 0 && isFinite(audio.duration) && audio.duration > 0) {
        cuesRef.current = buildCues(cueKey, audio.duration);
      }
      const next = audio.paused ? NEUTRAL : visemeAt(cuesRef.current, audio.currentTime);
      const now = performance.now();
      if (next !== currentRef.current && (next === NEUTRAL || now - lastSwap >= MIN_SWAP_MS)) {
        setViseme(next);
        lastSwap = now;
      }
      raf = requestAnimationFrame(tick);
    };
    cuesRef.current = [];
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      try {
        if (currentRef.current !== NEUTRAL) rive.stop(currentRef.current);
        rive.play(NEUTRAL);
      } catch {}
      currentRef.current = NEUTRAL;
    };
  }, [rive, audio, cueKey]);

  const isHero = variant === "hero";
  // Framing copied from the Nova demo page: a square canvas scaled up around its
  // upper-middle, cropped by an overflow-hidden box, so we see head + shoulders
  // instead of the whole body.
  const frame: React.CSSProperties = isHero
    ? { width: "100%", maxWidth: 420, aspectRatio: "5 / 4" }
    : { width: size, height: size };
  const zoom = isHero ? 1.3 : 1.9;
  return (
    <div
      className={`relative overflow-hidden flex-shrink-0 ${isHero ? "rounded-3xl" : "rounded-full"}`}
      style={{
        ...frame,
        background: "radial-gradient(ellipse 80% 90% at 50% 25%, #e6d4ff 0%, #b494e8 55%, #6c4bb0 100%)",
      }}
    >
      {loadFailed ? (
        <div className="w-full h-full flex items-center justify-center">
          <span style={{ fontSize: isHero ? "min(30vh, 220px)" : `${size * 0.45}px` }}>{config.fallbackEmoji}</span>
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            aspectRatio: "1 / 1",
            transform: `scale(${zoom})`,
            transformOrigin: isHero ? "50% 25%" : "50% 22%",
          }}
        >
          <RiveComponent style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </div>
  );
}
