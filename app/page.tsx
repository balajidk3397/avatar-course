"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VIDEO_DATA, type VideoCard } from "@/lib/video-data";
import { track } from "@/lib/analytics";
import { useUser } from "./user-context";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 22"
      fill={filled ? "#FF4D6D" : "none"}
      stroke={filled ? "#FF4D6D" : "white"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// "Speaking Booster 1" sparkle icon — commented out with its label (not required).
// function SparkleBadge({ size = 31 }: { size?: number }) {
//   const inner = Math.round(size * 0.68);
//   return (
//     <span
//       className="inline-flex items-center justify-center rounded-full flex-shrink-0"
//       style={{ width: size, height: size, background: "white" }}
//     >
//       {/* Inlined (was /assets/sparkle.svg) — 310B, eliminates ~7K edge requests. */}
//       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" width={inner} height={inner} style={{ display: "block" }}>
//         <path d="M16 2 L17.5 13 L28 16 L17.5 19 L16 30 L14.5 19 L4 16 L14.5 13 Z" fill="#7C3AED" stroke="#7C3AED" strokeLinejoin="round" />
//         <path d="M25 4 L25.8 8.2 L30 9 L25.8 9.8 L25 14 L24.2 9.8 L20 9 L24.2 8.2 Z" fill="#A78BFA" />
//       </svg>
//     </span>
//   );
// }

const PRELOAD_AHEAD = 3;
const PRELOAD_BEHIND = 1;

function VideoCardItem({
  card,
  idx,
  activeIdx,
  onBecameActive,
  muted,
  onToggleMute,
  coachmark = false,
}: {
  card: VideoCard;
  idx: number;
  activeIdx: number;
  onBecameActive: (idx: number) => void;
  muted: boolean;
  onToggleMute: () => void;
  // Paid first-practice nudge: when true AND this card is the active reel, the
  // Practice button gets a pulsing ring + a "tap me" tooltip.
  coachmark?: boolean;
}) {
  const shouldLoad = idx >= activeIdx - PRELOAD_BEHIND && idx <= activeIdx + PRELOAD_AHEAD;
  const router = useRouter();
  const { hasActiveSubscription, redirectToPremium, markPracticeEntered } = useUser();
  const showCoachmark = coachmark && idx === activeIdx;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(card.likes);
  const [heartAnimKey, setHeartAnimKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [indicatorKey, setIndicatorKey] = useState(0);
  const [burstHeart, setBurstHeart] = useState<{ key: number; x: number; y: number } | null>(null);
  const [shimmer, setShimmer] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  // Paid reel-2 gate: blur everything down to the Practice button + coachmark when
  // a not-yet-activated paid user tries to swipe forward. `coachmark` is only true
  // on that gate reel, so this stays inert elsewhere.
  const touchStartYRef = useRef<number | null>(null);
  const [gateBlur, setGateBlur] = useState(false);
  const showGateBlur = coachmark && gateBlur;

  useEffect(() => {
    const v = videoRef.current;
    const el = containerRef.current;
    if (!v || !el) return;

    let wasVisible = false;
    // Dwell-time gate for the reel_viewed analytics event: a card has to stay
    // visible for DWELL_MS before counting as a real impression. 3s matches
    // industry "actually watched" thresholds and avoids buffering-stall noise.
    const DWELL_MS = 3000;
    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.6;
        if (visible && !wasVisible) {
          v.currentTime = 0;
          v.play().catch(() => {});
          setPaused(false);
          wasVisible = true;
          console.log("[feed] card", card.id, "autoplay —", card.word);
          // Update parent so the rolling preload window shifts to follow us.
          onBecameActive(idx);
          if (dwellTimer) clearTimeout(dwellTimer);
          dwellTimer = setTimeout(() => {
            track("reel_viewed", { reelId: card.id, word: card.word });
            dwellTimer = null;
          }, DWELL_MS);
        } else if (!visible && wasVisible) {
          v.pause();
          setShimmer(false);
          setGateBlur(false); // re-arm the reel-2 gate on return
          wasVisible = false;
          console.log("[feed] card", card.id, "paused (scrolled out)");
          if (dwellTimer) {
            clearTimeout(dwellTimer);
            dwellTimer = null;
          }
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (dwellTimer) clearTimeout(dwellTimer);
    };
  }, [card.id, card.word, idx, onBecameActive]);

  // Shimmer the Practice CTA in the last ~5s of the video to lead the user.
  // Video has `loop`, so onEnded never fires — watch currentTime instead and
  // reset when it wraps back to near 0.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => {
      const dur = v.duration;
      if (!dur || !isFinite(dur)) return;
      const remaining = dur - v.currentTime;
      if (remaining <= 5 && remaining > 0) {
        setShimmer(prev => {
          if (!prev) console.log("[feed] shimmer ON — card", card.id, "remaining:", remaining.toFixed(2), "dur:", dur.toFixed(2));
          return true;
        });
      } else if (v.currentTime < 0.4) {
        setShimmer(prev => {
          if (prev) console.log("[feed] shimmer OFF — card", card.id, "looped at", v.currentTime.toFixed(2));
          return false;
        });
      }
    };
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [card.id]);

  // Smooth playback progress bar: drive it from rAF (~60fps) instead of the
  // video's coarse, ~4/s `timeupdate` event (which made the bar step/jump).
  // The loop only runs while the video is actually playing.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    const tick = () => {
      const dur = v.duration;
      if (dur && isFinite(dur) && progressRef.current) {
        progressRef.current.style.width = `${(v.currentTime / dur) * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    const stop = () => cancelAnimationFrame(raf);
    v.addEventListener("play", start);
    v.addEventListener("pause", stop);
    if (!v.paused) start();
    return () => {
      stop();
      v.removeEventListener("play", start);
      v.removeEventListener("pause", stop);
    };
  }, [card.id]);

  const handleLike = useCallback(() => {
    setLiked(prev => {
      if (!prev) {
        setLikeCount(c => c + 1);
        setHeartAnimKey(k => k + 1);
        console.log("[feed] liked card", card.id, "—", card.word);
      } else {
        setLikeCount(c => c - 1);
        console.log("[feed] unliked card", card.id, "—", card.word);
      }
      return !prev;
    });
  }, [card.id, card.word]);

  const handleTogglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
    setIndicatorKey(k => k + 1);
  }, []);

  const handleVideoTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tapTimerRef.current !== null) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;

      setLiked(prev => {
        if (prev) {
          setLikeCount(c => c - 1);
        } else {
          setLikeCount(c => c + 1);
          setHeartAnimKey(k => k + 1);
          setBurstHeart({ key: Date.now(), x, y });
        }
        return !prev;
      });
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      tapTimerRef.current = null;
      handleTogglePlay();
    }, 260);
  }, [handleTogglePlay]);

  useEffect(() => () => {
    if (tapTimerRef.current !== null) clearTimeout(tapTimerRef.current);
  }, []);

  const handlePracticeTap = useCallback(() => {
    console.log("[feed] practice tapped — word:", card.word, "| videoId:", card.id, "| paid:", hasActiveSubscription);
    track("reel_practice_tapped", { reelId: card.id, word: card.word, paid: hasActiveSubscription });
    if (!hasActiveSubscription) {
      track("practice_gated", { reelId: card.id, word: card.word });
      redirectToPremium();
      return;
    }
    // Paid user is entering the practice page — the activation moment that lifts
    // the reel-2 gate (persisted in user-context).
    markPracticeEntered();
    router.push(`/practice?word=${encodeURIComponent(card.word)}&phonetic=${encodeURIComponent(card.phonetic)}&sentence=${encodeURIComponent(card.sentence)}&videoId=${card.id}&total=${VIDEO_DATA.length}`);
  }, [card.word, card.id, card.phonetic, card.sentence, hasActiveSubscription, redirectToPremium, markPracticeEntered, router]);

  // Reel-2 gate: fire the blur-spotlight whenever a not-yet-activated paid user
  // tries to swipe forward on the gate reel (`coachmark`). Reel 2 is the last
  // rendered card for them, so the swipe can't actually advance — this is the
  // "you're stuck, practice first" feedback.
  const armGate = useCallback(() => {
    if (coachmark) setGateBlur(true);
  }, [coachmark]);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const start = touchStartYRef.current;
    if (start == null) return;
    // Finger moving up = trying to swipe to the next reel.
    if (start - (e.touches[0]?.clientY ?? start) > 28) armGate();
  }, [armGate]);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.deltaY > 0) armGate(); // scroll down = forward
  }, [armGate]);

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div
      ref={containerRef}
      className="snap-item"
      style={{ background: "#0D0E1A" }}
      data-testid={`video-card-${card.id}`}
      onTouchStart={coachmark ? handleTouchStart : undefined}
      onTouchMove={coachmark ? handleTouchMove : undefined}
      onWheel={coachmark ? handleWheel : undefined}
    >
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={handleVideoTap}
        data-testid={`video-tap-${card.id}`}
      >
        <video
          ref={videoRef}
          key={card.id}
          src={shouldLoad ? card.src : undefined}
          className="w-full h-full pointer-events-none"
          loop
          muted={muted}
          playsInline
          preload={shouldLoad ? "auto" : "none"}
          style={{ objectFit: "cover" }}
        />
      </div>

      <div className="absolute inset-0 video-overlay-gradient pointer-events-none" />

      {/* Video playback progress bar (bottom edge). Width set imperatively in the timeupdate handler. */}
      <div className={`absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-10 pointer-events-none${showGateBlur ? " hidden" : ""}`}>
        <div ref={progressRef} className="h-full bg-white" style={{ width: "0%" }} />
      </div>

      {burstHeart && (
        <div
          key={burstHeart.key}
          className="absolute pointer-events-none z-30 burst-heart"
          style={{
            left: burstHeart.x,
            top: burstHeart.y,
            transform: "translate(-50%, -50%)",
          }}
          onAnimationEnd={() => setBurstHeart(null)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="120" height="110" viewBox="0 0 24 22" fill="white">
            <path d="M12 21s-7.5-4.6-10-9.5C.6 8 2 4.5 5 3.4c2.2-.8 4.5.3 5.5 2 1-.0 2-.7 3.5-1.7 1.5-.8 3.5-1.2 5 0 3 1.1 4.4 4.6 3 8.1C19.5 16.4 12 21 12 21z" />
          </svg>
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
        className={`absolute top-16 right-8 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:opacity-70${showGateBlur ? " hidden" : ""}`}
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
        data-testid={`mute-button-${card.id}`}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        )}
      </button>

      {indicatorKey > 0 && (
        <div
          key={indicatorKey}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        >
          <div
            className="pause-indicator-pop w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          >
            {paused ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white">
                <polygon points="6,4 20,12 6,20" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            )}
          </div>
        </div>
      )}

      <div className="absolute left-5 right-5 bottom-10 z-10 flex items-start justify-between gap-4 pointer-events-none">
        <div className="flex flex-col items-start gap-3 pointer-events-auto">
          {/* "Speaking Booster 1" label + sparkle icon — removed per request (not required).
          <div className={`flex items-center gap-2.5${showGateBlur ? " hidden" : ""}`}>
            <SparkleBadge size={36} />
            <span className="text-white font-semibold text-base drop-shadow-md">
              Speaking Booster 1
            </span>
          </div>
          */}
          <div className="relative">
            {showCoachmark && (
              <div
                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-30 pointer-events-none whitespace-nowrap coachmark-bob-x"
                data-testid="practice-coachmark"
              >
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold drop-shadow-md"
                  style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
                >
                  <span className="text-base leading-none">👈</span> Tap Practice to unlock
                </span>
              </div>
            )}
            <button
              onClick={handlePracticeTap}
              className={`px-5 py-2.5 rounded-lg font-bold text-white text-sm tracking-wide transition-opacity active:opacity-85${showCoachmark ? " practice-coachmark" : shimmer ? " practice-shimmer" : ""}`}
              style={{
                background: "hsl(258 90% 66%)",
                boxShadow: "0 6px 20px hsl(258 90% 66% / 0.45)",
              }}
              data-testid={`practice-button-${card.id}`}
            >
              Practice
            </button>
          </div>
        </div>

        <div className={`pointer-events-auto pt-1${showGateBlur ? " hidden" : ""}`}>
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 transition-transform active:scale-95"
            data-testid={`like-button-${card.id}`}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <div
              key={heartAnimKey}
              className={heartAnimKey > 0 ? "heart-pop" : ""}
            >
              <HeartIcon filled={liked} />
            </div>
            <span className="text-sm font-semibold text-white drop-shadow-md mt-1">
              {formatCount(likeCount)}
            </span>
          </button>
        </div>
      </div>

      {/* Reel-2 gate: blur + dim the video behind the (un-moved) Practice button +
          coachmark. z-[5] keeps it UNDER the bottom content (z-10), so the button
          and coachmark stay sharp in their normal place; pointer-events off so a
          swipe can still reach reel 1. */}
      {showGateBlur && (
        <div
          className="absolute inset-0 z-[5] pointer-events-none"
          style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", background: "rgba(7,8,15,0.5)" }}
          data-testid="reel2-gate-blur"
        />
      )}
    </div>
  );
}

function LockGlyph() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// Full-screen snap item rendered after the free user's 3 free reels → premium.
// (The paid gate has no lock card — it keeps the user on reel 2 with a blur.)
function LockCard() {
  const { redirectToPremium } = useUser();

  return (
    <div
      className="snap-item flex flex-col items-center justify-center text-center px-8"
      style={{ background: "#0D0E1A" }}
      data-testid="lock-card"
      data-variant="upgrade"
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
        style={{ background: "rgba(124,58,237,0.18)" }}
      >
        <LockGlyph />
      </div>
      <h2 className="text-white text-2xl font-bold mb-3 leading-tight">
        Unlock all reels
      </h2>
      <p className="text-white/70 text-base mb-8 max-w-xs leading-relaxed">
        You&apos;ve watched your 3 free reels. Upgrade to keep practicing your pronunciation.
      </p>
      <button
        onClick={() => {
          console.log("[feed] reel wall — upgrade CTA tapped");
          redirectToPremium();
        }}
        className="px-8 py-3.5 rounded-xl font-bold text-white text-base practice-coachmark"
        style={{ background: "hsl(258 90% 66%)", boxShadow: "0 6px 20px hsl(258 90% 66% / 0.45)" }}
        data-testid="lock-upgrade-cta"
      >
        Upgrade
      </button>
    </div>
  );
}

const MUTE_KEY = "feed_muted";

function VideoFeedInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, hasActiveSubscription, practiceActivated } = useUser();
  // Always start muted for SSR (avoids hydration mismatch + autoplay policy on fresh load).
  // After mount, restore the user's saved preference — safe because by the time they
  // return from Practice the browser has a user gesture so unmuted autoplay is allowed.
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem(MUTE_KEY) === "0") {
          setMuted(false);
          console.log("[feed] restored unmuted preference from session");
        }
      } catch {}
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);
  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m;
      try { sessionStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch {}
      console.log("[feed] mute toggled →", next ? "muted" : "unmuted");
      return next;
    });
  }, []);
  const searchParams = useSearchParams();

  // Rolling-window preload: only cards near the active one load video data.
  // Initial active index honors ?next=N (1-indexed reel id) so returning from
  // /practice positions the window around the destination reel immediately.
  const [activeIdx, setActiveIdx] = useState(() => {
    if (typeof window === "undefined") return 0;
    const next = new URLSearchParams(window.location.search).get("next");
    const id = next ? parseInt(next, 10) : NaN;
    if (isNaN(id)) return 0;
    return Math.max(0, Math.min(VIDEO_DATA.length - 1, id - 1));
  });

  // Swipe hint appears 2s after landing on reel 1 — targets users who linger
  // without swiping, rather than nagging everyone instantly. Cancelled if they
  // swipe away before the delay elapses.
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (activeIdx !== 0) return;
    const t = setTimeout(() => setShowHint(true), 2000);
    // Reset on leaving reel 1 so the 2s delay re-applies if they scroll back.
    return () => { clearTimeout(t); setShowHint(false); };
  }, [activeIdx]);

  useEffect(() => {
    const nextId = searchParams.get("next");
    if (!nextId) return;
    // Clear the param without a navigation so refresh doesn't re-scroll
    window.history.replaceState(null, "", "/");
    const id = parseInt(nextId, 10);
    if (isNaN(id)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local state to URL searchParams; this effect is the only place that can observe a route change without a remount.
    setActiveIdx(Math.max(0, Math.min(VIDEO_DATA.length - 1, id - 1)));
    // Wait one tick for cards to mount, then scroll
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-testid="video-card-${id}"]`);
      el?.scrollIntoView({ block: "start", behavior: "instant" });
      console.log("[feed] scrolled to card", id);
    });
  }, [searchParams]);

  // Tier gating — applied only once `ready` so paid users never flash the free
  // slice while the bridge context loads:
  //   - free user          → first 3 reels, then the upgrade wall
  //   - paid, not activated → reels 1-2 only (stuck on reel 2); the reel-2 blur
  //                           spotlight enforces "practice to continue" — no card
  //   - paid, activated     → full feed
  const FREE_REEL_LIMIT = 3;
  const PAID_GATE_AT = 2;
  let visibleCards = VIDEO_DATA;
  let showUpgradeLock = false;
  if (ready && !hasActiveSubscription) {
    visibleCards = VIDEO_DATA.slice(0, FREE_REEL_LIMIT);
    showUpgradeLock = true;
  } else if (ready && !practiceActivated) {
    visibleCards = VIDEO_DATA.slice(0, PAID_GATE_AT);
  }
  // A stale ?next must not point past the visible slice.
  const activeClamped = Math.max(0, Math.min(activeIdx, visibleCards.length - 1));

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: "#07080F" }}
    >
      <div
        ref={containerRef}
        className="snap-container absolute inset-0"
      >
        {visibleCards.map((card, idx) => (
          <VideoCardItem
            key={card.id}
            card={card}
            idx={idx}
            activeIdx={activeClamped}
            onBecameActive={setActiveIdx}
            muted={muted}
            onToggleMute={toggleMute}
            coachmark={ready && hasActiveSubscription && !practiceActivated && idx === 1}
          />
        ))}
        {showUpgradeLock && <LockCard />}
      </div>

      {/* Swipe-up hint — only on the first reel; auto-hides once the user
          scrolls (activeIdx changes). No persistence: shows every session. */}
      {activeIdx === 0 && showHint && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-44 z-20 flex flex-col items-center gap-1 pointer-events-none animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}>
            <path d="M18 15l-6-6-6 6" />
          </svg>
          <span className="text-white text-xs font-semibold tracking-wide drop-shadow-md">Swipe up for more</span>
        </div>
      )}
    </div>
  );
}

export default function VideoFeed() {
  return (
    <Suspense>
      <VideoFeedInner />
    </Suspense>
  );
}
