import { CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import {
  Input,
  InputLabel,
  InputHelper,
  InputError,
  TextFieldValidatedInput,
  TextFieldPasswordInput,
  type PasswordRules,
} from "@/components/Input";
import { type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   TextField — the canonical labelled input ROW for SERVER-ACTION forms:
   a label, a single-line text input, and an optional helper OR error line,
   laid out and styled by the mother Input family. Use it inside a
   <form action={serverAction}> when you want the field's value to arrive
   in FormData — that is what `name` is for, and it is the one thing the
   compound Input family deliberately does not expose.

   Why this exists (and is not just <Input/>): the mother InputField reads
   everything from context and renders its <input> keyed only by `id` — it
   carries NO `name`, so a server action never receives its value. Two
   Moonlight waves re-solved this locally; TextField is the one obvious
   thing to import instead. It stays a THIN composition: it renders the
   sanctioned <Input> shell (which emits the shared "magentaweb-input"
   style sheet and provides label/helper/error context) and composes the
   real InputLabel / InputHelper / InputError subparts. The only bespoke
   piece is the <input> itself, which must carry `name`; it opts into the
   mother's field styling via the `data-mw-input-field` / `data-size` /
   `data-error` contract rather than reimplementing it.

   Server component: no state, no handlers — it is uncontrolled by design
   (pass `defaultValue`; the browser submits the live value by `name`).
   For file / number / textarea chrome, reach for <Input> directly.

   `validateOnBlur` is the one exception to zero-JS: when set, the bespoke
   <input> swaps for TextFieldValidatedInput, a small client leaf shipped
   from the Input family's client module, which checks native constraints
   on blur and routes the browser's validationMessage through the same
   error line. This file stays a server module either way; without the
   prop the render is byte-identical to before the prop existed.
   ============================================================ */

type FieldSize = "sm" | "md" | "lg";

type TextInputType =
  | "text"
  | "email"
  | "password"
  | "tel"
  | "url"
  | "search"
  | "number"
  | "date"
  | "time"
  | "datetime-local";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "size" | "type"> {
  /** Wires the label's htmlFor and the helper/error describedby ids. */
  id: string;
  /** The FormData key the server action reads. The reason TextField exists. */
  name: string;
  /** Visible field label. */
  label: ReactNode;
  /** Guidance shown below the field when there is no error. */
  helper?: ReactNode;
  /** Error message; when set it replaces the helper and marks the field invalid. */
  error?: ReactNode;
  /** Check native constraints on blur and surface the browser's message
      through the error line. Mounts a small client leaf; a set `error`
      always wins over the internal message. */
  validateOnBlur?: boolean;
  /** Adds the native required constraint (and, by default, the asterisk). */
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  /** Single-line input type. Defaults to "text". */
  type?: TextInputType;
  /** Control size, forwarded to the mother field styling. Defaults to "md". */
  size?: FieldSize;
  /** Password only: a trailing control that swaps the value between hidden and
      readable. Mounts the password client leaf. */
  reveal?: boolean;
  /** Password only: the rules this value must satisfy, listed under the field
      from first paint and ticked as each one is met. DATA, not predicates: a
      function cannot cross the RSC boundary into the client leaf. Mounts it. */
  requirements?: PasswordRules;
}

export function TextField({
  id,
  name,
  label,
  helper,
  error,
  validateOnBlur = false,
  required = false,
  marking,
  type = "text",
  size = "md",
  reveal = false,
  requirements,
  disabled,
  className,
  style,
  ...rest
}: TextFieldProps) {
  // Password affordances win the routing when asked for. They are gated on the
  // TYPE as well as the prop: a reveal control on an email field would swap an
  // input's type out from under the browser's autofill for no benefit.
  const isPassword = type === "password" && (reveal || Boolean(requirements));
  const hasError = Boolean(error);
  const errorMessage = typeof error === "boolean" ? undefined : error;
  // A bare `true` styles the field invalid and carries no text, so the message
  // line is gated on a real message: the helper stays rendered and described,
  // and no empty alert is ever emitted. hasError keeps driving aria-invalid.
  const hasErrorMessage = Boolean(errorMessage);
  // Ids match the mother Input convention so InputHelper/InputError (which
  // derive them from context) line up with this input's aria-describedby.
  const describedBy = hasErrorMessage
    ? `${id}-error`
    : helper
      ? `${id}-helper`
      : undefined;

  return (
    <Input id={id} size={size} required={required} marking={marking} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      {isPassword ? (
        // The second client leaf, and the same bargain as the first: mounted
        // only when asked for, so every other field in the fleet keeps the
        // zero-JS server path this component exists to protect.
        <TextFieldPasswordInput
          {...rest}
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          size={size}
          helper={helper}
          error={error}
          reveal={reveal}
          requirements={requirements}
          className={className}
          style={style}
        />
      ) : validateOnBlur ? (
        // The one client piece, and only when asked for: the same bespoke
        // named input plus the helper-or-error line, with blur validation
        // state. The leaf applies the mother fieldBaseStyle itself (the same
        // properties fieldStyle mirrors below), so only the caller's style
        // needs forwarding.
        <TextFieldValidatedInput
          {...rest}
          id={id}
          name={name}
          type={type}
          required={required}
          disabled={disabled}
          size={size}
          helper={helper}
          error={error}
          className={className}
          style={style}
        />
      ) : (
        <>
          <input
            {...rest}
            id={id}
            name={name}
            type={type}
            required={required}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            data-mw-input-field=""
            data-size={size}
            data-error={hasError ? "true" : "false"}
            className={className}
            style={{ ...fieldStyle, ...style }}
          />
          {hasErrorMessage ? (
            <InputError>{errorMessage}</InputError>
          ) : helper ? (
            <InputHelper>{helper}</InputHelper>
          ) : null}
        </>
      )}
    </Input>
  );
}

/* ---------- inline styles (token-pure) ---------- */

// Only the properties the mother applies INLINE on its own field (background,
// border, padding and font-size live in the hoisted "magentaweb-input" sheet
// keyed on [data-mw-input-field], so they arrive for free; radius, width, font
// and colour do not). Mirrors Input's fieldBaseStyle token-for-token so this
// input is visually identical to a mother field, including hover/focus/error
// states supplied by the sheet.
const fieldStyle: CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-body)",
  color: "var(--text-positive-primary)",
  borderRadius: "var(--component-radius)",
  outline: "none",
  transition:
    "border-color var(--motion-transition), background var(--motion-transition), box-shadow var(--motion-transition)",
};
