"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { srOnly } from "@/components/internal/styles";
import { ToastInput, ToastRecord, ToastViewport } from "./Toast";

/* ============================================================
   ToastProvider — owns the toast queue and exposes useToast() so any
   component in the tree can raise or dismiss a notification. Wraps the
   whole app from the root layout and renders the fixed ToastViewport
   at the end of the tree.

   Announcements (pass 3, 4.1.3): the provider renders two permanently
   mounted screen-reader-only channels BESIDE the viewport, one
   role="status" (polite) for info and success, one role="alert" for
   warning and error, and writes each new toast's title and description
   into the matching one. A live region announces on MUTATION, so a
   region born together with its text (the card, until pass 3) was
   spoken by some AT and not others; the channels exist before any
   toast does. The text is keyed by toast id so the identical message
   raised twice is two DOM mutations ("Changes saved" twice speaks
   twice), and a channel empties once its toast has left the queue (a
   removal is silent under the default aria-relevant), so no stale
   message lingers for the virtual cursor to find.

   Dismissal is two-phase: dismiss() flips the toast's `leaving` flag so
   the card can play its exit animation, then a timeout removes it from
   state. The exit window is a fixed 900ms, sized to cover the longest
   dial duration (gentle, 703ms) with margin. On the still dial the
   transition is 0ms, so the card is gone visually at once and the node
   lingering invisible until the timeout is harmless.

   Keyboard focus is handed back in PHASE ONE, not at removal: the moment
   `leaving` flips, ToastViewport moves focus off a dismissed toast to
   wherever it entered the viewport from (see Toast.tsx). Until v5.10.0 the
   user sat on the vanishing dismiss button for 900ms and then fell to
   <body>, which is where a self-removing control always lands focus.
   ============================================================ */

const EXIT_MS = 900; // longest dial exit (gentle, 703ms after the 12 Aug retune) plus margin; see header note

interface ToastContextValue {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  toasts: ToastRecord[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

// What the channels speak: the newest toast, routed by tone.
interface Announcement {
  id: string;
  assertive: boolean;
  text: string;
}

// The title, then the description as its own sentence.
function announcementText({ title, description }: ToastRecord): string {
  const t = title.trim();
  if (!description) return t;
  return /[.!?]$/.test(t) ? `${t} ${description}` : `${t}. ${description}`;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [announced, setAnnounced] = useState<Announcement | null>(null);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      // Empty the channel once its toast is gone. A removal is not announced
      // under the default aria-relevant, so this is silent.
      setAnnounced((prev) => (prev?.id === id ? null : prev));
    }, EXIT_MS);
  }, []);

  const toast = useCallback((input: ToastInput) => {
    // Monotonic counter rather than a random id so server and client never
    // disagree, and so ids stay stable keys across re-renders.
    const id = `toast-${counterRef.current++}`;
    const record: ToastRecord = { tone: "info", ...input, id };
    // Newest on top: prepend so a fresh toast pushes the stack downward.
    setToasts((prev) => [record, ...prev]);
    setAnnounced({
      id,
      assertive: record.tone === "warning" || record.tone === "error",
      text: announcementText(record),
    });
    return id;
  }, []);

  const value = useMemo(
    () => ({ toast, dismiss, toasts }),
    [toast, dismiss, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
      {/* The announcement channels: resident from mount, siblings of the
          viewport (which is aria-live="off"), keyed by toast id so a repeat
          is a fresh mutation. See the header note. */}
      <div role="status" aria-live="polite" aria-atomic="true" data-mw-toast-live="status" style={srOnly}>
        {announced && !announced.assertive ? <span key={announced.id}>{announced.text}</span> : null}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" data-mw-toast-live="alert" style={srOnly}>
        {announced && announced.assertive ? <span key={announced.id}>{announced.text}</span> : null}
      </div>
    </ToastContext.Provider>
  );
}
