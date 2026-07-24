"use client";

import { useEffect, useRef, useState } from "react";
import { Fit, Layout, useRive, useStateMachineInput } from "@rive-app/react-canvas";
import type { RiveCharacterConfig } from "@/lib/avatars-course/rive-config";

interface RiveCharacterProps {
  config: RiveCharacterConfig | undefined;
  isSpeaking: boolean;
  isListening: boolean;
  emote?: "correct" | "incorrect" | null;
  size?: number;
  variant?: "circle" | "hero";
}

export function RiveCharacter({
  config,
  isSpeaking,
  isListening,
  emote,
  size = 160,
  variant = "circle",
}: RiveCharacterProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  const { rive, RiveComponent } = useRive({
    src: config?.src ?? "",
    artboard: config?.artboard,
    stateMachines: config?.stateMachine,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain }),
    onLoadError: () => {
      console.warn("[RiveCharacter] failed to load .riv asset:", config?.src);
      setLoadFailed(true);
    },
  });

  const speakingInput = useStateMachineInput(
    rive,
    config?.stateMachine ?? "",
    config?.inputs.speaking ?? ""
  );
  const listeningInput = useStateMachineInput(
    rive,
    config?.stateMachine ?? "",
    config?.inputs.listening ?? ""
  );
  const correctInput = useStateMachineInput(
    rive,
    config?.stateMachine ?? "",
    config?.inputs.correct ?? ""
  );
  const incorrectInput = useStateMachineInput(
    rive,
    config?.stateMachine ?? "",
    config?.inputs.incorrect ?? ""
  );

  const warnedRef = useRef(new Set<string>());
  const warnOnce = (label: string) => {
    if (warnedRef.current.has(label)) return;
    warnedRef.current.add(label);
    console.warn(`[RiveCharacter] state machine input not found: ${label} — falling back silently`);
  };

  // Rive's StateMachineInput is an imperative handle from the Rive runtime, not a
  // React-owned value — setting .value is the documented way to drive it.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => {
    if (!config) return;
    if (!speakingInput) {
      warnOnce(`speaking (${config.inputs.speaking})`);
      return;
    }
    // eslint-disable-next-line react-hooks/immutability
    speakingInput.value = isSpeaking;
  }, [isSpeaking, speakingInput, config]);

  useEffect(() => {
    if (!config) return;
    if (!listeningInput) {
      warnOnce(`listening (${config.inputs.listening})`);
      return;
    }
    // eslint-disable-next-line react-hooks/immutability
    listeningInput.value = isListening;
  }, [isListening, listeningInput, config]);

  useEffect(() => {
    if (!config || !emote) return;
    const input = emote === "correct" ? correctInput : incorrectInput;
    const label = emote === "correct" ? config.inputs.correct : config.inputs.incorrect;
    if (!input) {
      warnOnce(`${emote} (${label})`);
      return;
    }
    // Triggers use fire(); booleans use value — try both since we don't know
    // the input type ahead of the real asset's confirmed schema.
    if (typeof input.fire === "function") {
      input.fire();
    } else {
      // eslint-disable-next-line react-hooks/immutability
      input.value = true;
    }
  }, [emote, correctInput, incorrectInput, config]);

  const showFallback = !config || loadFailed;
  const isHero = variant === "hero";
  const fallbackFontSize = isHero ? "min(30vh, 220px)" : `${size * 0.45}px`;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden flex-shrink-0 ${
        isHero ? "w-full rounded-3xl" : "rounded-full"
      }`}
      style={{
        width: isHero ? "100%" : size,
        height: isHero ? "min(46vh, 420px)" : size,
        background: config
          ? "hsl(228 22% 13%)"
          : "linear-gradient(135deg, hsl(258 90% 66%), hsl(280 90% 60%))",
      }}
    >
      {showFallback ? (
        <div
          className={`w-full h-full flex items-center justify-center ${isHero ? "rounded-3xl" : "rounded-full"} ${
            isSpeaking ? "animate-pulse" : ""
          }`}
          style={{ background: config?.fallbackColor ?? "hsl(258 90% 66%)" }}
        >
          <span style={{ fontSize: fallbackFontSize }}>{config?.fallbackEmoji ?? "🙂"}</span>
        </div>
      ) : (
        <RiveComponent style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}
