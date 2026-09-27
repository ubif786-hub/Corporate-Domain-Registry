"use client";

import {
  CSSProperties,
  isValidElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, ButtonProps } from "@/components/Button";
import { Modal, ModalProps } from "@/components/Modal";
import { useToast } from "@/components/ToastProvider";

/* ============================================================
   FormModal — the edit-modal choreography as a primitive. A trigger opens a
   mother Modal over a form; on submit it runs an async `onSubmit`, toasts on
   success and closes, or shows a CALM failure (a warning toast) WITHOUT
   closing, so the typed values stay put for correction. The proven ArtistHQ /
   studio-moonlight register (edit-specs, supplier-editor), lifted to one shape
   every product can reuse instead of re-wiring open state, pending, and toasts.

   Two deliberate mechanics carry the whole pattern:
   - The form REMOUNTS on each open via a key bump (openCount). An abandoned
     draft from a prior Cancel never reappears the next time the modal opens —
     each open starts from the field defaultValues, not the last typed state.
   - It submits through onSubmit (NOT <form action>). React 19 auto-resets a
     `<form action>` after it settles even on the FAILURE branch, wiping the
     values just when they are needed to fix the error. onSubmit + preventDefault
     keeps them; and because the key only bumps on OPEN, a failed submit leaves
     the same mounted form, values intact.
   - The submit button is aria-disabled, not natively disabled, while a save is
     in flight (v5.12.0, the fourth member of the in-flight focus class after
     ChatComposer, AiCard and NotificationFeed). The native attribute blurs the
     control the user just pressed, and with the page behind the dialog inert
     the next Tab re-entered the dialog instead of the page top. Button cancels
     the click in that state and a ref guards the handler against re-entry, so
     a second press, or Enter in a field, during a flight submits nothing.

   Compose the fields as `children` — any inputs / mother fields you like. The
   footer (Cancel + submit) and the submit lifecycle are the primitive's. Client
   component: it owns open state, the pending flag, and the toast calls.
   ============================================================ */

/** The outcome contract for `onSubmit`: a discriminated success/failure so the
 *  primitive knows whether to close (ok) or hold with a warning (the error). */
export type FormModalResult = { ok: true } | { ok: false; error: string };

/** The button-descriptor trigger shape: render a mother Button that opens the
 *  modal. Use this for the common case; pass a ReactNode instead to bring your
 *  own trigger element (a bubbled-click wrapper supplies the open handler). */
export interface FormModalTrigger {
  label: ReactNode;
  variant?: NonNullable<ButtonProps["variant"]>;
}

export interface FormModalProps {
  /** What opens the modal. Either a button descriptor ({ label, variant }) — the
   *  primitive renders a mother Button — or any ReactNode, wrapped in a
   *  display:contents span whose bubbled click opens the modal (the trigger's
   *  own onClick, if any, runs first). The focused control inside stays the
   *  focus origin, so Modal restores focus to it on close. */
  trigger: ReactNode | FormModalTrigger;
  /** The dialog title. Names the dialog (drives Modal's aria-labelledby). */
  title: string;
  /** Optional supporting line under the title (drives aria-describedby). */
  description?: string;
  /** The form fields. Rendered inside the <form>, above the action row. */
  children: ReactNode;
  /** Runs on submit with the form's FormData. Resolve { ok: true } to toast
   *  success and close, or { ok: false, error } to hold open with a calm
   *  warning. A thrown error is caught and shown as a generic warning. */
  onSubmit: (formData: FormData) => Promise<FormModalResult>;
  /** The submit button label. Default "Save". */
  submitLabel?: string;
  /** The success toast's title (v6.36.2). Default "Saved"; a create says what it made
   *  ("Lead added", "Invoice raised"), the HQ v7 interactions file's "<Thing> saved". */
  successTitle?: string;
  /** Modal width. Passed straight to Modal. Default "md". */
  size?: ModalProps["size"];
  /** The container (v6.30.0), passed straight to Modal: "modal" (default) for a form of at most
   *  three fields or one decision; "drawer" for a create of four or more fields or a section
   *  break, the right-anchored sheet that keeps the page scrollable behind its veil. Neither
   *  pushes the page (HQ v7 system pass, theme 9). */
  variant?: ModalProps["variant"];
}

export function FormModal({
  trigger,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Save",
  successTitle = "Saved",
  size,
  variant,
}: FormModalProps) {
  const [open, setOpen] = useState(false);
  // Bumped on every open so the <form key> remounts with fresh defaultValues:
  // an abandoned draft never persists, and the key holding steady across a
  // failed submit is exactly what lets the typed values survive (see banner).
  const [openCount, setOpenCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // The re-entry guard, in a ref so it is true the instant a submit starts,
  // not one render later. The aria-disabled submit button already cancels its
  // own click (Button does that), but a form can be submitted past the button
  // (requestSubmit, or Enter in a field with no default button to click), so
  // the handler itself is the last line: a submit during a flight is a no-op.
  const inFlight = useRef(false);
  const { toast } = useToast();
  // The first field takes focus on open (v6.36.2, the HQ v7 interactions file: "A Modal traps
  // focus; the first field is focused on open"). Modal focuses its panel in its own effect; this
  // runs two frames later, after that, and only when the form has a field to give it to.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!open) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const first = formRef.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea");
        first?.focus();
      });
    });
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
  }, [open, openCount]);

  const openModal = () => {
    setOpenCount((c) => c + 1);
    setOpen(true);
  };

  const submit = async (formData: FormData) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const res = await onSubmit(formData);
      if (res.ok) {
        toast({ tone: "success", title: successTitle });
        setOpen(false);
      } else {
        // Calm failure: hold the modal open, keep the values, name what went
        // wrong. No close, no reset.
        toast({ tone: "warning", title: "Not saved", description: res.error });
      }
    } catch {
      toast({
        tone: "warning",
        title: "Not saved",
        description: "Something went wrong. Try again in a moment.",
      });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  // Resolve the trigger. A button descriptor renders a mother Button; any
  // other ReactNode is wrapped in a display:contents span whose bubbled click
  // opens the modal.
  // v4.8.0 fix (found via the Tooltip hydration fix's root cause): the old
  // path CLONED the trigger element to inject onClick — but a trigger authored
  // in a SERVER component crosses the RSC boundary as its RENDERED tree (a
  // mother Button arrives as [<style>, <button>], not one clonable element),
  // so isValidElement(trigger) read false, no handler was ever attached, and
  // the modal silently never opened (the markup is identical either way, so
  // nothing warned). Delegation handles every trigger shape — client element,
  // server-rendered tree, fragment — and composes with the trigger's own
  // onClick, which runs first on the bubble path. display:contents adds no
  // layout box, and focus stays on the real control inside, so the overlay's
  // capture-and-restore focus contract is unchanged.
  const triggerNode = isTriggerButton(trigger) ? (
    <Button variant={trigger.variant} type="button" onClick={openModal}>
      {trigger.label}
    </Button>
  ) : (
    <span style={{ display: "contents" }} onClick={openModal}>
      {trigger}
    </span>
  );

  return (
    <>
      {triggerNode}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        size={size}
        variant={variant}
      >
        {/* onSubmit, not <form action>: React 19 resets an action form even on
            the failure branch, wiping the typed values. preventDefault + a
            manual FormData keeps them so a failed submit is correctable. */}
        <form
          key={openCount}
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          style={formStyle}
        >
          {children}
          <div style={footerRowStyle}>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {/* aria-disabled, never the native attribute: the user is focused
                on this control when it flips, and the native attribute drops
                that focus to <body> (see the banner). Button paints the
                disabled look and cancels the click; the label carries the
                state to the accessible name. */}
            <Button variant="primary" type="submit" aria-disabled={submitting || undefined}>
              {submitting ? "Saving" : submitLabel}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ---------- helpers ---------- */

/** A button descriptor is a plain object carrying `label` (not a React element
 *  and not another primitive node), which is how it splits from a ReactNode. */
function isTriggerButton(
  trigger: ReactNode | FormModalTrigger,
): trigger is FormModalTrigger {
  return (
    typeof trigger === "object" &&
    trigger !== null &&
    !isValidElement(trigger) &&
    "label" in trigger
  );
}

/* ---------- inline styles (token-pure) ---------- */

const formStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-md)",
};

const footerRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-sm)",
};
