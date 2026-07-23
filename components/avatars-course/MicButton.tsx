"use client";

interface MicButtonProps {
  state: "idle" | "recording" | "busy";
  onPress: () => void;
}

export function MicButton({ state, onPress }: MicButtonProps) {
  const busy = state === "busy";
  return (
    <button
      onClick={onPress}
      disabled={busy}
      className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95 ${busy ? "opacity-50" : ""}`}
      style={{
        background: state === "recording" ? "hsl(0 80% 60%)" : "hsl(258 90% 66%)",
        boxShadow: `0 6px 28px ${state === "recording" ? "hsl(0 80% 60% / 0.5)" : "hsl(258 90% 66% / 0.5)"}`,
      }}
      aria-label={state === "recording" ? "Stop recording" : "Start recording"}
    >
      {state === "recording" ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="white">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="white">
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
