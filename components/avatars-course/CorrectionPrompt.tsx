"use client";

interface CorrectionPromptProps {
  correctedText: string | null;
}

export function CorrectionPrompt({ correctedText }: CorrectionPromptProps) {
  if (!correctedText) return null;
  return (
    <div
      className="w-full rounded-2xl px-4 py-3 flex items-start gap-2.5"
      style={{ background: "hsl(35 90% 55% / 0.12)", border: "1px solid hsl(35 90% 55% / 0.3)" }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(35 90% 60%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      <p className="text-white/80 text-sm leading-snug">
        Try saying it like this: <span className="text-white font-medium">&ldquo;{correctedText}&rdquo;</span>
      </p>
    </div>
  );
}
