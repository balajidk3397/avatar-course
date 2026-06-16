"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  type BridgeContext,
  type BridgeUser,
  emitNavigationOpen,
  getBridge,
} from "@/lib/bridge";
import { track, hasEnteredPractice } from "@/lib/analytics";

const DEV_PAID_KEY = "sn_dev_is_paid";
// Set when we redirect to /premium so we know to refresh on return.
// sessionStorage survives the host-driven navigation but is cleared on tab close.
const AWAIT_RETURN_KEY = "sn_await_premium_return";
// Local mirror of the paid "first-practice activation" flag. Lets the feed unlock
// instantly (no KV round-trip) when a paid user taps Practice, and avoids a gate
// flash for returning activated users. KV (`practice_started`) is the source of
// truth — clearing this local flag just triggers a re-confirm against KV.
const PAID_ACTIVATED_KEY = "pr_paid_activated";

type UserContextValue = {
  ready: boolean;
  isNative: boolean;
  hasActiveSubscription: boolean;
  // Paid-only: has this user entered the practice page at least once?
  practiceActivated: boolean;
  // Call the instant a paid user taps Practice (persists locally + flips state).
  markPracticeEntered: () => void;
  user: BridgeUser;
  auth: BridgeContext["auth"];
  redirectToPremium: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

function readDevIsPaid(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("is_paid");
  if (fromQuery === "true" || fromQuery === "false") {
    try {
      localStorage.setItem(DEV_PAID_KEY, fromQuery);
    } catch {
      // ignore — private mode etc.
    }
    return fromQuery === "true";
  }
  try {
    return localStorage.getItem(DEV_PAID_KEY) === "true";
  } catch {
    return false;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<BridgeContext | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getBridge((bridge) => {
      setCtx(bridge ? bridge.getContext() : null);
      setReady(true);
    });
  }, []);

  // bridge.getContext() is a boot-time snapshot — subscription state won't change
  // after the user pays. When we sent them to /premium and they return to the
  // webview, reload so the host re-injects fresh context.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      let pending = false;
      try {
        pending = sessionStorage.getItem(AWAIT_RETURN_KEY) === "1";
      } catch {
        // ignore
      }
      if (!pending) return;
      try {
        sessionStorage.removeItem(AWAIT_RETURN_KEY);
      } catch {
        // ignore
      }
      window.location.reload();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const isNative = ctx?.host.isNative === true;

  // Gate requires BOTH: user has paid (is_paid) AND subscription is active.
  // is_active alone is true for free_trial users — we want to gate them.
  // In browser dev (no user in context) fall back to the ?is_paid= flag.
  const hasActiveSubscription = (() => {
    if (!ready) return false;
    const isPaid = ctx?.user?.is_paid === true;
    const subActive = ctx?.user?.subscription?.is_active === true;
    if (isPaid && subActive) return true;
    if (!isNative && !ctx?.user) return readDevIsPaid();
    return false;
  })();

  // Read the local mirror synchronously on first render so a returning activated
  // user never flashes the locked state.
  const [practiceActivated, setPracticeActivated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(PAID_ACTIVATED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const markPracticeEntered = useCallback(() => {
    try {
      localStorage.setItem(PAID_ACTIVATED_KEY, "1");
    } catch {
      // ignore — private mode / quota; KV (practice_started) remains the truth.
    }
    setPracticeActivated(true);
  }, []);

  // Confirm activation from KV for paid users who aren't already locally marked —
  // handles cleared local storage / a fresh device where they DID practice before.
  // null/false => keep the gate up (never falsely unlock).
  useEffect(() => {
    if (!ready || !hasActiveSubscription || practiceActivated) return;
    let cancelled = false;
    void hasEnteredPractice().then((entered) => {
      if (cancelled || entered !== true) return;
      try {
        localStorage.setItem(PAID_ACTIVATED_KEY, "1");
      } catch {
        // ignore
      }
      setPracticeActivated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, hasActiveSubscription, practiceActivated]);

  const redirectToPremium = useCallback(() => {
    try {
      sessionStorage.setItem(AWAIT_RETURN_KEY, "1");
    } catch {
      // ignore — reload-on-return just won't fire
    }
    track("premium_redirect", {});
    emitNavigationOpen("/premium");
  }, []);

  const value: UserContextValue = {
    ready,
    isNative,
    hasActiveSubscription,
    practiceActivated,
    markPracticeEntered,
    user: ctx?.user ?? null,
    auth: ctx?.auth,
    redirectToPremium,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const value = useContext(UserContext);
  if (!value) {
    throw new Error("useUser must be used inside <UserProvider>");
  }
  return value;
}
