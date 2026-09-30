"use client";

import {
  ChangeEvent,
  CSSProperties,
  createContext,
  DragEvent,
  FocusEvent,
  HTMLInputTypeAttribute,
  InputHTMLAttributes,
  MouseEvent,
  ReactNode,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Checkmark,
  ChevronDown,
  ChevronUp,
  Close,
  Upload,
  View,
  ViewOff,
} from "@carbon/icons-react";
import { srOnly } from "@/components/internal/styles";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";

/* ============================================================
   Input — compound form-field family. A root component shares context
   with subparts so consumers can hand-compose, or pass convenience
   props (`label`, `helper`, `error`) and let the root assemble the
   parts.

   The subparts are NAMED EXPORTS (InputLabel, InputField, InputHelper,
   InputError), not static properties on Input. This is the same choice
   Tabs makes and for the same reason: static properties on a
   "use client" function do not survive the server/client module
   boundary in the App Router (a server component importing Input would
   read Input.Field as undefined). Named exports work in both contexts.
   See the compound-component policy in CLAUDE.md. Compose them as:
     import { Input, InputLabel, InputField } from "@/components/Input";
     <Input id="x"><InputLabel>…</InputLabel><InputField/></Input>

   Type variants: text, email, password, tel, url, search, number,
   date, file, textarea. The Field component switches on type and
   renders the appropriate native control, with file upload and number
   getting their own custom chrome (drag-and-drop drop zone for file,
   stepper buttons for number).

   Validation: `error` is display-only; the family never decides a
   value is wrong by itself. `validateOnBlur` is the sanctioned
   convenience on top: in SIMPLE mode the root checks the field's
   native constraints on blur and routes the browser's
   validationMessage through the existing error path (same tokens,
   role="alert", aria wiring). Compound mode stays display-only for
   now; the doc says so.

   Client component because file upload tracks drag-over and filename
   state, number tracks a ref to the underlying input for stepper
   increment / decrement, and validate-on-blur holds the current
   validity message.
   ============================================================ */

type InputType =
  | "text"
  | "email"
  | "password"
  | "tel"
  | "url"
  | "search"
  | "number"
  | "date"
  | "file"
  | "textarea";

type InputSize = "sm" | "md" | "lg";

interface InputContextValue {
  id: string;
  /** The InputLabel's element id (`${id}-label`). The file field names itself by it. */
  labelId: string;
  /** Whether an InputLabel is rendered, so a file field never points aria-labelledby at
   *  nothing. Simple mode knows (`label`); compound mode assumes the documented
   *  composition, where the consumer places an InputLabel. */
  hasLabel: boolean;
  helperId: string;
  errorId: string;
  size: InputSize;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  marking: FieldMarkingKind;
  hasError: boolean;
  /** hasError WITH a message to show. A bare `error={true}` sets hasError (aria-invalid, the
   *  error border) but not this, so the helper stays and no empty alert is emitted. */
  hasErrorMessage: boolean;
  hasHelper: boolean;
  // Validate-on-blur plumbing. The root populates these in SIMPLE mode only
  // (validateOnBlur set, no children), so hand-composed compound children never
  // pick up blur validation by accident; everywhere else they are undefined and
  // the field handlers no-op. The context is module-private, so these never
  // become consumer API.
  onFieldBlur?: (el: HTMLInputElement | HTMLTextAreaElement) => void;
  onFieldChange?: (el: HTMLInputElement | HTMLTextAreaElement) => void;
  /** FORM-INPUT-1: the root's forwarded native attributes (name, autoComplete, and the rest
   *  of InputHTMLAttributes it does not own), spread onto whichever native element the field
   *  type renders (the plain input/textarea branch, NumberField, FileField). */
  nativeProps: Record<string, unknown>;
}

const InputContext = createContext<InputContextValue | null>(null);

function useInputContext(): InputContextValue {
  const ctx = useContext(InputContext);
  if (!ctx) {
    throw new Error("InputLabel / InputField / InputHelper / InputError must be used inside <Input>");
  }
  return ctx;
}

// FORM-INPUT-1 (4 Sep 2026): Input rendered from an explicit prop list and spread no rest,
// so `name` never reached the DOM and a native <form method="post"> submitted without the
// field (Textarea already extended the native props and spread rest; same form kit,
// opposite behaviour). The extends below is additive: every prop Input owns explicitly is
// omitted from the native attribute set it inherits, so the existing API is untouched and
// the caller now also gets `name`, `autoComplete`, and the rest of InputHTMLAttributes
// (pattern, list, maxLength, inputMode, aria-*, data-*, ...) forwarded onto whichever
// native element the field type renders. onBlur/style/className/onChange stay owned
// (Input drives its own blur-validation and onChange signature) so a rest value can never
// silently shadow them.
export interface InputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    | "id"
    | "type"
    | "value"
    | "defaultValue"
    | "onChange"
    | "onBlur"
    | "placeholder"
    | "required"
    | "disabled"
    | "size"
    | "children"
    | "multiple"
    | "accept"
    | "step"
    | "min"
    | "max"
    | "rows"
    | "style"
    | "className"
  > {
  id: string;
  label?: ReactNode;
  type?: InputType;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  /** What the label SHOWS. Defaults to deriving from `required`. */
  marking?: FieldMarkingKind;
  disabled?: boolean;
  /** The value is REAL and submits, but cannot be edited. Distinct from disabled:
   *  a read-only field stays focusable, copyable and in FormData, so its ink stays
   *  at full strength and only the ground and border quieten. */
  readOnly?: boolean;
  /** Error message, rendered as InputError in place of the helper. A bare `true` styles the
   *  field invalid (aria-invalid, the error border) WITHOUT a message: the helper stays and no
   *  empty alert is emitted. */
  error?: ReactNode;
  helper?: ReactNode;
  /** Check native constraints on blur and surface the browser's message
      through the error line. Simple mode only; a set `error` always wins. */
  validateOnBlur?: boolean;
  size?: InputSize;
  multiple?: boolean;
  accept?: string;
  rows?: number;
  step?: number;
  min?: number;
  max?: number;
  children?: ReactNode;
}

export function Input({
  id,
  label,
  type = "text",
  value,
  defaultValue,
  onChange,
  placeholder,
  required = false,
  marking,
  disabled = false,
  readOnly = false,
  error,
  helper,
  validateOnBlur = false,
  size = "md",
  multiple,
  accept,
  rows,
  step,
  min,
  max,
  children,
  name,
  autoComplete,
  ...rest
}: InputProps) {
  /* Validate-on-blur state. Holds the browser's validationMessage from the
     last blur, or null while the field is (or has recovered to) valid. The
     pattern is "reward early, punish late": errors appear only on blur, but
     once flagged, any keystroke that makes the value valid clears the message
     immediately so the user sees the recovery. Simple mode only: with children
     present the root cannot reach the hand-composed control, so the handlers
     below stay undefined and compound mode remains display-only. A controlled
     `error` prop always wins over the internal message. */
  const [validityMessage, setValidityMessage] = useState<string | null>(null);
  const validityActive = validateOnBlur && !children;
  // A bare `error={true}` is the invalid STATE without a message: it wins over the validity
  // message like any set error, but enters no message branch, so the helper stays and
  // aria-describedby keeps naming real text (27 Aug 2026).
  const errorMessage: ReactNode = error === true ? null : error;
  const shownError: ReactNode = error ? errorMessage : validityActive ? validityMessage : null;
  const hasError = Boolean(error) || Boolean(shownError);
  const hasErrorMessage = Boolean(shownError);
  const hasHelper = Boolean(helper);
  const ctx: InputContextValue = {
    id,
    labelId: `${id}-label`,
    // Compound mode cannot see a hand-composed InputLabel from here, so it assumes one (the
    // documented composition). A compound file field with no InputLabel at all has no field
    // label to be named by either way; its aria-labelledby then resolves to nothing, which the
    // IDREF probes flag as the authoring error it is.
    hasLabel: children ? true : Boolean(label),
    helperId: `${id}-helper`,
    errorId: `${id}-error`,
    size,
    disabled,
    readOnly,
    required,
    // Resolved once, here, so InputLabel does not re-derive it and the two can
    // never disagree about what the label shows.
    marking: resolveMarking(marking, required),
    hasError,
    hasErrorMessage,
    hasHelper,
    onFieldBlur: validityActive
      ? (el) => setValidityMessage(el.validity.valid ? null : el.validationMessage)
      : undefined,
    onFieldChange: validityActive
      ? (el) => {
          if (validityMessage !== null && el.validity.valid) setValidityMessage(null);
        }
      : undefined,
    nativeProps: { name, autoComplete, ...rest },
  };

  const hoistedStyle = (
    <style href="magentaweb-input" precedence="default">{inputCss}</style>
  );

  if (children) {
    return (
      <InputContext.Provider value={ctx}>
        {hoistedStyle}
        <div data-mw-input="" style={rootStyle}>
          {children}
        </div>
      </InputContext.Provider>
    );
  }

  return (
    <InputContext.Provider value={ctx}>
      {hoistedStyle}
      <div data-mw-input="" style={rootStyle}>
        {label ? <InputLabel>{label}</InputLabel> : null}
        <InputField
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          placeholder={placeholder}
          multiple={multiple}
          accept={accept}
          rows={rows}
          step={step}
          min={min}
          max={max}
        />
        {/* InputError and InputHelper are different component types, so React already replaces
            the node here rather than mutating the helper into an alert; no keys needed. */}
        {hasErrorMessage ? (
          <InputError>{shownError}</InputError>
        ) : hasHelper ? (
          <InputHelper>{helper}</InputHelper>
        ) : null}
      </div>
    </InputContext.Provider>
  );
}

/* ---------- InputLabel ---------- */

export interface InputLabelProps {
  children: ReactNode;
}

export function InputLabel({ children }: InputLabelProps) {
  const { id, labelId, marking } = useInputContext();
  // `id` on the label: the file field points aria-labelledby at it (see FileField).
  return (
    <FieldLabel id={labelId} htmlFor={id} dataAttr="data-mw-input-label" marking={marking} style={labelBindStyle}>{children}</FieldLabel>
  );
}

/* ---------- InputHelper ---------- */

export interface InputHelperProps {
  children: ReactNode;
}

export function InputHelper({ children }: InputHelperProps) {
  const { helperId } = useInputContext();
  return (
    <p id={helperId} data-mw-input-helper="" style={helperStyle}>
      {children}
    </p>
  );
}

/* ---------- InputError ---------- */

export interface InputErrorProps {
  children: ReactNode;
}

export function InputError({ children }: InputErrorProps) {
  const { errorId } = useInputContext();
  return (
    <p id={errorId} role="alert" data-mw-input-error="" style={errorStyle}>
      {children}
    </p>
  );
}

/* ---------- InputField ---------- */

export interface InputFieldProps {
  type?: InputType;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  multiple?: boolean;
  accept?: string;
  rows?: number;
  step?: number;
  min?: number;
  max?: number;
}

export function InputField({
  type = "text",
  value,
  defaultValue,
  onChange,
  placeholder,
  multiple,
  accept,
  rows = 4,
  step = 1,
  min,
  max,
}: InputFieldProps) {
  const ctx = useInputContext();
  const describedBy = ctx.hasErrorMessage
    ? ctx.errorId
    : ctx.hasHelper
      ? ctx.helperId
      : undefined;

  if (type === "file") {
    return (
      <FileField
        multiple={multiple}
        accept={accept}
        describedBy={describedBy}
      />
    );
  }

  if (type === "number") {
    return (
      <NumberField
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        describedBy={describedBy}
        step={step}
        min={min}
        max={max}
      />
    );
  }

  const sharedProps = {
    id: ctx.id,
    placeholder,
    disabled: ctx.disabled,
    readOnly: ctx.readOnly,
    required: ctx.required,
    "aria-invalid": ctx.hasError || undefined,
    "aria-required": ctx.required || undefined,
    "aria-describedby": describedBy,
    "data-mw-input-field": "",
    "data-size": ctx.size,
    "data-error": ctx.hasError ? "true" : "false",
    // FORM-INPUT-1: name, autoComplete and the rest of the root's forwarded native
    // attributes. Spread before the explicit handlers below so onChange/onBlur stay owned.
    ...ctx.nativeProps,
  };
  const controlledProps =
    value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {};

  if (type === "textarea") {
    return (
      <textarea
        {...sharedProps}
        {...controlledProps}
        rows={rows}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
          onChange?.(e.target.value);
          ctx.onFieldChange?.(e.target);
        }}
        onBlur={(e: FocusEvent<HTMLTextAreaElement>) => ctx.onFieldBlur?.(e.currentTarget)}
        style={textareaStyle}
      />
    );
  }

  return (
    <input
      {...sharedProps}
      {...controlledProps}
      type={type}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.target.value);
        ctx.onFieldChange?.(e.target);
      }}
      onBlur={(e: FocusEvent<HTMLInputElement>) => ctx.onFieldBlur?.(e.currentTarget)}
      style={fieldBaseStyle}
    />
  );
}

/* ---------- FileField ---------- */

interface FileFieldProps {
  multiple?: boolean;
  accept?: string;
  describedBy?: string;
}

function FileField({ multiple, accept, describedBy }: FileFieldProps) {
  const { id, labelId, hasLabel, disabled, required, hasError, nativeProps } = useInputContext();
  // The zone's status line (the empty prompt, or the picked file's name) is the input's
  // DESCRIPTION, ahead of the helper or error line, WHEN a label names the input. See the note
  // below the status text.
  const statusId = `${id}-status`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const setFromList = (list: FileList | null) => {
    if (!list) return;
    setFiles(Array.from(list));
  };

  const onChangeNative = (e: ChangeEvent<HTMLInputElement>) => {
    setFromList(e.target.files);
  };

  const onDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (disabled) return;
    setDragOver(true);
  };
  const onDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
  };
  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    setFromList(e.dataTransfer.files);
    if (inputRef.current && e.dataTransfer.files) {
      // Sync dropped files into the native input so form submission picks them up.
      try {
        inputRef.current.files = e.dataTransfer.files;
      } catch {
        // Some browsers disallow assigning to .files; the visual state still reflects
        // the dropped selection, which is the primary affordance.
      }
    }
  };

  const clear = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const statusText =
    files.length === 0
      ? "Drop a file here or click to browse"
      : files.length === 1
        ? files[0].name
        : `${files.length} files selected`;

  return (
    <>
      {/* NAME, DESCRIPTION, VALUE (4.1.2, 27 Aug 2026, two passes). The input has TWO labels: the
          InputLabel above the zone and this wrapping zone <label>, and every associated label
          joins a control's name from ALL its content, embedded controls included. Pass 3 moved
          the Clear button out of the zone, which fixed the worse half ("Receipt invoice.pdf
          Clear file selection"); the zone's status text still joined ("Receipt invoice.pdf"),
          which is the picked file's name, the control's VALUE, read as its name. So the input
          names itself by aria-labelledby pointing at the InputLabel ALONE (aria-labelledby beats
          both <label> associations), the status span carries an id and joins aria-describedby
          ahead of the helper or error line, and the engine's own value already reads the
          picked file's name. The required marker needs nothing extra: `required` and
          aria-required carry it, and the label's asterisk is aria-hidden by FieldLabel.
          WITHOUT a label there is nothing for aria-labelledby to point at, so the zone label
          names the input from its status text as before, and the status then stays OUT of
          aria-describedby: it is already the name, and describing a control by its own name
          reads it twice (measured 27 Aug 2026: "scan.pdf" named and "scan.pdf Up to 5 MB"
          described). The helper or error line is the whole description in that case.
          The zone <label> KEEPS htmlFor: its click-to-open is the label activation behaviour,
          which naming by aria-labelledby does not touch. The INPUT stays inside it, and the
          label stays position:relative: it is that srOnly input's containing block by contract
          (internal/styles.ts; the Modal scroll bug in the CHANGELOG). The wrapper is positioned
          only so the Clear button can sit over the zone from OUTSIDE the label. */}
      <div data-mw-input-file-wrap="" style={fileWrapStyle}>
        <label
          htmlFor={id}
          data-mw-input-file=""
          data-drag-over={dragOver ? "true" : "false"}
          data-has-file={files.length > 0 ? "true" : "false"}
          data-error={hasError ? "true" : "false"}
          data-disabled={disabled ? "true" : "false"}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          style={{ ...fileLabelStyle, ...(files.length > 0 ? fileLabelWithClearStyle : null) }}
        >
          <span style={fileIconStyle}>
            <Upload size={20} aria-hidden="true" />
          </span>
          <span id={statusId} style={fileTextStyle}>{statusText}</span>
          <input
            ref={inputRef}
            id={id}
            type="file"
            multiple={multiple}
            accept={accept}
            disabled={disabled}
            required={required}
            aria-invalid={hasError || undefined}
            aria-required={required || undefined}
            // Without an InputLabel there is nothing to point at, so the wrapping label names
            // the input as before rather than a dangling IDREF naming nothing, and the status
            // (then the name itself) is not also the description. `|| undefined` so a label-less
            // field with no helper carries no empty aria-describedby.
            aria-labelledby={hasLabel ? labelId : undefined}
            aria-describedby={[hasLabel ? statusId : undefined, describedBy].filter(Boolean).join(" ") || undefined}
            onChange={onChangeNative}
            style={srOnly}
            // FORM-INPUT-1: `name` (and any other forwarded native attribute) is what lets a
            // file field submit in a plain <form>; before this it had no way to reach here.
            {...nativeProps}
          />
        </label>
        {files.length > 0 ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear file selection"
            data-mw-input-file-clear=""
            style={fileClearStyle}
          >
            <Close size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <span role="status" aria-live="polite" style={srOnly}>
        {files.length > 0 ? statusText : ""}
      </span>
    </>
  );
}

/* ---------- NumberField ---------- */

interface NumberFieldProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  describedBy?: string;
  step?: number;
  min?: number;
  max?: number;
}

function NumberField({
  value,
  defaultValue,
  onChange,
  placeholder,
  describedBy,
  step = 1,
  min,
  max,
}: NumberFieldProps) {
  const { id, size, disabled, readOnly, required, hasError, onFieldBlur, onFieldChange, nativeProps } = useInputContext();
  const ref = useRef<HTMLInputElement>(null);

  const bump = (delta: number) => {
    const el = ref.current;
    // readOnly too (27 Aug 2026): the contract is "real value, no edits", and a step is an
    // edit. The buttons are disabled below as well; this guard is the backstop.
    if (!el || disabled || readOnly) return;
    const current = Number(el.value || "0");
    let next = current + delta;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    el.value = String(next);
    onChange?.(String(next));
    // Programmatic value sets fire no React change event, so tell the
    // validate-on-blur plumbing directly: a stepper click that clamps the
    // value back into range should clear a flagged message like typing does.
    onFieldChange?.(el);
  };

  const controlledProps =
    value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {};

  return (
    <div style={numberWrapStyle}>
      <input
        ref={ref}
        id={id}
        type="number"
        {...controlledProps}
        placeholder={placeholder}
        disabled={disabled}
        // Never reached this input before 27 Aug 2026, so <Input type="number" readOnly> was
        // fully editable. On the element it also switches on the :read-only wash in the sheet.
        readOnly={readOnly}
        required={required}
        step={step}
        min={min}
        max={max}
        aria-invalid={hasError || undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          onChange?.(e.target.value);
          onFieldChange?.(e.target);
        }}
        onBlur={(e: FocusEvent<HTMLInputElement>) => onFieldBlur?.(e.currentTarget)}
        data-mw-input-field=""
        data-size={size}
        data-error={hasError ? "true" : "false"}
        style={{
          ...fieldBaseStyle,
          // Clears the stepper column: control-size-xs plus clearance, kept
          // constant so the field never resizes with the spacing dial.
          paddingRight: "2.25rem",
        }}
        // FORM-INPUT-1: name/autoComplete/rest forwarded from the root.
        {...nativeProps}
      />
      {/* Disabled, not merely inert, when read-only: a focusable button that does nothing is
          worse than one that says it cannot. */}
      <div data-mw-input-stepper="" style={numberButtonsStyle}>
        <button
          type="button"
          onClick={() => bump(step)}
          disabled={disabled || readOnly}
          aria-label="Increment"
          style={numberButtonStyle}
        >
          <ChevronUp size={12} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => bump(-step)}
          disabled={disabled || readOnly}
          aria-label="Decrement"
          style={numberButtonStyle}
        >
          <ChevronDown size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ---------- TextFieldValidatedInput ---------- */

/* TextField's validate-on-blur engine, not a compound subpart. It lives in
   this file because blur validation needs state and handlers and TextField
   must stay a server module (system.json registers it kind "server"); this is
   the family's one client module, so the leaf ships from here. TextField
   mounts it inside its <Input> shell ONLY when validateOnBlur is set, so the
   zero-JS server path is untouched when the prop is absent. It carries `name`
   deliberately: it IS TextField's bespoke named input, and the compound
   family's rule that InputField exposes no `name` stands. Renders the input
   plus the helper-or-error line (the two move together once validity state
   exists), reusing InputError / InputHelper from the surrounding shell's
   context, which is why it must sit inside <Input>. */

export interface TextFieldValidatedInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "size" | "type"> {
  id: string;
  name: string;
  type?: HTMLInputTypeAttribute;
  helper?: ReactNode;
  error?: ReactNode;
  size?: InputSize;
}

export function TextFieldValidatedInput({
  id,
  name,
  type = "text",
  helper,
  error,
  required = false,
  disabled,
  size = "md",
  className,
  style,
  onBlur,
  onChange,
  ...rest
}: TextFieldValidatedInputProps) {
  const [validityMessage, setValidityMessage] = useState<string | null>(null);
  // A controlled error prop always wins over the browser's validity message. A bare `true` is
  // the invalid state WITHOUT a message: the helper stays (27 Aug 2026; the root's note).
  const errorMessage: ReactNode = error === true ? null : error;
  const shownError: ReactNode = error ? errorMessage : validityMessage;
  const hasError = Boolean(error) || Boolean(shownError);
  const hasErrorMessage = Boolean(shownError);
  // Ids follow the mother Input convention, matching the shell's context ids.
  const describedBy = hasErrorMessage ? `${id}-error` : helper ? `${id}-helper` : undefined;

  return (
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
        style={{ ...fieldBaseStyle, ...style }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          onChange?.(e);
          // Reward early: once flagged, clear as soon as the value recovers.
          // New errors never appear mid-keystroke; they wait for the next blur.
          if (validityMessage !== null && e.target.validity.valid) setValidityMessage(null);
        }}
        onBlur={(e: FocusEvent<HTMLInputElement>) => {
          onBlur?.(e);
          // Punish late: flag (or re-check and clear) only when the user
          // leaves the field. An empty required field flags here too.
          setValidityMessage(
            e.currentTarget.validity.valid ? null : e.currentTarget.validationMessage,
          );
        }}
      />
      {hasErrorMessage ? (
        <InputError>{shownError}</InputError>
      ) : helper ? (
        <InputHelper>{helper}</InputHelper>
      ) : null}
    </>
  );
}

/* ---------- TextFieldPasswordInput ---------- */

/* TextField's password affordances, and the second leaf to ship from this
   module for the reason the first one does: TextField is a server component
   (system.json registers it kind "server") and both of these need state.
   Mounted only when `reveal` or `requirements` is set, so the zero-JS server
   path is untouched for every other field in the fleet.

   TWO AFFORDANCES, ONE LEAF, because they are one control in practice: a
   person typing against a rule list is the same person who wants to see what
   they typed, and splitting them would mean two wrappers fighting over the
   same trailing padding.

   THE RULES ARE DATA, NOT PREDICATES, and that is a hard constraint rather
   than a preference. A `test: (v) => boolean` prop cannot cross the RSC
   boundary from a server TextField into this client leaf — the serializer
   refuses functions, the same trap Button.tsx already carries a note about.
   So the caller declares WHAT must be true and this leaf owns HOW it is
   checked, which also means every fork phrases the same rule the same way.

   The list renders from first paint, unmet, and is wired into the field's
   aria-describedby. That is the whole point of it: a rule a person only
   discovers by breaking it is an error message wearing a helper's clothes. */

/** Declarative password rules. Data, not predicates: see the note above. */
export interface PasswordRules {
  /** Minimum character count. */
  minLength?: number;
  /** Requires at least one digit. */
  number?: boolean;
  /** Requires at least one capital letter. */
  uppercase?: boolean;
  /** Requires at least one lowercase letter. */
  lowercase?: boolean;
  /** Requires at least one character that is neither a letter nor a digit. */
  symbol?: boolean;
}

function checkRules(rules: PasswordRules, value: string) {
  const out: { id: string; label: string; met: boolean }[] = [];
  if (rules.minLength) {
    out.push({
      id: "len",
      label: `At least ${rules.minLength} characters`,
      met: value.length >= rules.minLength,
    });
  }
  if (rules.number) out.push({ id: "num", label: "Contains a number", met: /[0-9]/.test(value) });
  if (rules.uppercase) {
    out.push({ id: "upper", label: "Contains a capital letter", met: /[A-Z]/.test(value) });
  }
  if (rules.lowercase) {
    out.push({ id: "lower", label: "Contains a lowercase letter", met: /[a-z]/.test(value) });
  }
  if (rules.symbol) {
    out.push({ id: "sym", label: "Contains a symbol", met: /[^A-Za-z0-9]/.test(value) });
  }
  return out;
}

export interface TextFieldPasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "size" | "type"> {
  id: string;
  name: string;
  helper?: ReactNode;
  error?: ReactNode;
  size?: InputSize;
  /** Show the reveal toggle. */
  reveal?: boolean;
  /** Show the rule list, ticking as each rule is met. */
  requirements?: PasswordRules;
}

export function TextFieldPasswordInput({
  id,
  name,
  helper,
  error,
  required = false,
  disabled,
  size = "md",
  reveal = false,
  requirements,
  className,
  style,
  onChange,
  ...rest
}: TextFieldPasswordInputProps) {
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState("");

  const errorMessage: ReactNode = error === true ? null : error;
  const hasError = Boolean(error);
  const hasErrorMessage = Boolean(errorMessage);
  const rules = requirements ? checkRules(requirements, value) : [];

  // The rule list is described ALONGSIDE the helper or error rather than
  // instead of it: they answer different questions, and an error that hid the
  // rules would take away the one thing that says how to fix it.
  const described = [
    hasErrorMessage ? `${id}-error` : helper ? `${id}-helper` : null,
    rules.length ? `${id}-requirements` : null,
  ].filter(Boolean);

  return (
    <>
      <div style={revealWrapStyle}>
        <input
          {...rest}
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          required={required}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-required={required || undefined}
          aria-describedby={described.length ? described.join(" ") : undefined}
          data-mw-input-field=""
          data-size={size}
          data-error={hasError ? "true" : "false"}
          className={className}
          style={{ ...fieldBaseStyle, ...(reveal ? revealFieldStyle : null), ...style }}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            onChange?.(e);
            if (requirements) setValue(e.target.value);
          }}
        />
        {reveal ? (
          // No aria-pressed beside a label that already changes: a screen
          // reader would announce "Show password, pressed", which is the
          // opposite of what just happened. The label names the ACTION.
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            disabled={disabled}
            aria-controls={id}
            style={revealButtonStyle}
          >
            {shown ? <ViewOff size={16} /> : <View size={16} />}
            <span style={srOnly}>{shown ? "Hide password" : "Show password"}</span>
          </button>
        ) : null}
      </div>
      {hasErrorMessage ? (
        <InputError>{errorMessage}</InputError>
      ) : helper ? (
        <InputHelper>{helper}</InputHelper>
      ) : null}
      {rules.length ? (
        <ul id={`${id}-requirements`} style={requirementListStyle}>
          {rules.map((r) => (
            <li key={r.id} style={requirementItemStyle} data-met={r.met ? "true" : "false"}>
              <span aria-hidden="true" style={r.met ? requirementMarkMetStyle : requirementMarkStyle}>
                {r.met ? <Checkmark size={12} /> : null}
              </span>
              <span style={r.met ? requirementTextMetStyle : requirementTextStyle}>{r.label}</span>
              <span style={srOnly}>{r.met ? " met" : " not yet met"}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/* ---------- inline styles ---------- */

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  // Fill the container's inline size in a flex/grid parent (e.g. a Card.Body
  // flex-start column) instead of shrink-wrapping to the widest control. In a
  // flex ROW this stretches the cross axis (height) only, so side-by-side fields
  // are unaffected; in a block context it is a no-op (already full width).
  alignSelf: "stretch",
};



// SECOND LAW (audit finding, 4 Sep 2026): the label's bind to its group must EXCEED the
// largest gap inside that group. It was inverted: the label bound to the field at the
// root's flex gap alone (--space-2xs, 4.34px) while the field-to-helper bind DOUBLED that
// gap via this marginTop stacked on top of the same flex gap (2xs + 2xs = ~8.69px). Fixed
// by moving the extra rung from here to the label (see labelBindStyle below): the helper
// now sits at the root's bare flex gap (--space-2xs), and the label-to-field bind is the
// one that reaches --space-xs. No marginTop here any more; the root's `gap` alone spaces
// this element from whatever precedes it.
const helperStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  // A-041: secondary (~11:1) — helper text conveys info, needs AA 4.5:1.
  color: "var(--text-positive-secondary)",
};

const errorStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--status-danger-text)",
};

// The extra rung moved off the helper/error (above): the root's flex gap already supplies
// --space-2xs between every pair of children, so adding this on the label's OWN box brings
// label -> field to --space-2xs + --space-2xs = --space-xs, one rung wider than the
// field -> helper bind, satisfying the second law instead of inverting it.
const labelBindStyle: CSSProperties = {
  marginBottom: "var(--space-2xs)",
};

/* background and border live in the hoisted sheet (base [data-mw-input-field]
   rule), NOT here: inline values beat the :hover/:focus/:disabled/[data-error]
   state rules and left the field's error border and focus styles dead (audit
   F1; the A-036 class Checkbox already fixed). */
const fieldBaseStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--text-positive-primary)",
  borderRadius: "var(--component-radius)",
  outline: "none",
  width: "100%",
  transition:
    "border-color var(--motion-transition), background var(--motion-transition), box-shadow var(--motion-transition)",
};

const textareaStyle: CSSProperties = {
  ...fieldBaseStyle,
  resize: "vertical",
  // --space-4xl holds 6rem at the normal dial ("about four text rows" at the field type
  // size); component code reads only semantic tokens (CLAUDE.md), never a raw rem literal.
  minHeight: "var(--space-fixed-4xl)",
  fontFamily: "var(--font-body)",
};

const numberWrapStyle: CSSProperties = {
  position: "relative",
  display: "block",
};

/* ---- password reveal + requirements ---- */

const revealWrapStyle: CSSProperties = {
  position: "relative",
  display: "block",
};

// Only applied when the toggle is actually rendered. The field's own padding
// arrives from the hoisted sheet; this reserves the trailing gutter so a long
// value runs under the button instead of behind it.
const revealFieldStyle: CSSProperties = {
  paddingInlineEnd: "var(--space-fixed-xl)",
};

const revealButtonStyle: CSSProperties = {
  position: "absolute",
  insetInlineEnd: "var(--space-fixed-2xs)",
  insetBlockStart: "50%",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  inlineSize: "var(--control-size-sm)",
  blockSize: "var(--control-size-sm)",
  padding: 0,
  border: "none",
  background: "transparent",
  borderRadius: "var(--control-glyph-radius)",
  color: "var(--text-positive-secondary)",
  cursor: "pointer",
};

const requirementListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
};

const requirementItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2xs)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-snug)",
};

// An outline ring that FILLS rather than a tick that appears from nothing:
// the row keeps its position and its width either way, so a list of five
// rules does not reflow while somebody types into it.
const requirementMarkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  inlineSize: "var(--space-fixed-md)",
  blockSize: "var(--space-fixed-md)",
  flex: "0 0 auto",
  borderRadius: "var(--radius-full)",
  border: "1px solid var(--border-positive-secondary)",
  color: "transparent",
};

const requirementMarkMetStyle: CSSProperties = {
  ...requirementMarkStyle,
  border: "1px solid transparent",
  background: "var(--accent-base)",
  color: "var(--text-on-accent)",
};

const requirementTextStyle: CSSProperties = {
  color: "var(--text-positive-secondary)",
};

const requirementTextMetStyle: CSSProperties = {
  color: "var(--text-positive-primary)",
};

const numberButtonsStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  flexDirection: "column",
  width: "var(--control-size-xs)",
  borderLeft: "1px solid var(--border-positive-secondary)",
};

/* ink and cursor live in the hoisted sheet ([data-mw-input-stepper] button), NOT here: inline
   values would beat the :disabled rule that dims a read-only field's steppers (audit F7). */
const numberButtonStyle: CSSProperties = {
  flex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: 0,
  padding: 0,
  transition: "background var(--motion-transition), color var(--motion-transition)",
};

/* background/border/color/cursor live in the hoisted sheet: inline values beat
   the drag-over, has-file, hover, error, and disabled rules, so the drop zone
   gave zero visual feedback (audit F2/F7). */
const fileLabelStyle: CSSProperties = {
  // The srOnly file input's containing block (see internal/styles.ts).
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-md)",
  borderRadius: "var(--component-radius)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  transition:
    "background var(--motion-transition), border-color var(--motion-transition), color var(--motion-transition)",
};

const fileIconStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  color: "var(--text-positive-tertiary)",
};

const fileTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

// The Clear button's positioning frame: it sits over the zone from outside the <label> (see
// the FileField note). The label inside stays the srOnly input's containing block, and since
// a labelled input names itself by aria-labelledby, nothing placed inside the zone joins its
// name (without a label the zone label still names it, from its status text).
const fileWrapStyle: CSSProperties = {
  position: "relative",
};

// With a file picked the Clear button overlays the zone's end, so the label reserves the width
// the button took in-flow (its size plus the row gap) and the file name still ellipsises short
// of it. Inline, like the label's own padding, so the two never fight the cascade.
const fileLabelWithClearStyle: CSSProperties = {
  paddingInlineEnd: "calc(var(--space-md) + var(--control-size-xs) + var(--space-sm))",
};

const fileClearStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  // Inside the zone's 2px dashed border (the sheet), where the button sat in-flow.
  right: "calc(var(--space-md) + 2px)",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "var(--control-size-xs)",
  height: "var(--control-size-xs)",
  padding: 0,
  background: "transparent",
  border: 0,
  borderRadius: "var(--component-radius)",
  color: "var(--text-positive-secondary)",
  cursor: "pointer",
  transition: "background var(--motion-transition), color var(--motion-transition)",
};

// Hover, focus, disabled, error, size variants. Pseudo-states cannot be
// expressed via CSSProperties so they live in a hoisted style block. React 19
// dedupes by precedence, so the rule emits once across the page.
const inputCss = `
/* Base visual state in the SHEET so the state rules below can win the cascade
   (audit F1/F2/F7: these were inline and every hover/focus/error/disabled rule
   silently lost to them). */
[data-mw-input-field] {
  background: var(--background-positive-secondary);
  border: 1px solid var(--border-positive-secondary);
}
[data-mw-input-file] {
  background: var(--background-positive-secondary);
  border: 2px dashed var(--border-positive-secondary);
  color: var(--text-positive-secondary);
  cursor: pointer;
}
/* CONTROL HEIGHT PARITY (31 Aug 2026). A single-line field takes the form kit's
   leading, not the body's prose leading.

   The bug this fixes, measured on a live page at size lg: an Input and a Button
   sitting side by side in a search form rendered 67.28px and 61.09px. Font size
   (20.62px), block padding (17.184px each side), border (1px) and box-sizing were
   IDENTICAL on both; the whole 6.19px gap was leading. Button pins
   --leading-tight (1.2); this field pinned nothing and inherited --leading-normal
   (1.5), and 20.62 x (1.5 - 1.2) = 6.19px. One variable, exactly the delta.

   Input and Select were the only two controls in the kit that had not pinned it:
   Button, Combobox, MultiSelect, SegmentedControl, DropdownMenu and Listbox all
   already did. So this is bringing two outliers into line, not introducing a rule.

   NOT the textarea. It shares [data-mw-input-field] (the shared prop block above),
   and a multi-line field holds prose, which wants the relaxed leading it has
   always had. Hence :not(textarea) rather than a blanket rule: without that carve
   out this would tighten every textarea in the fleet.

   probe-control-geometry.mjs did not catch this because it measures the HORIZONTAL
   adornment inset only. Vertical parity across the control family was uncovered. */
[data-mw-input-field]:not(textarea) {
  line-height: var(--leading-tight);
}
[data-mw-input-field][data-size="sm"] {
  font-size: var(--type-sm);
  padding: var(--space-xs) var(--space-sm);
}
[data-mw-input-field][data-size="md"] {
  font-size: var(--type-md);
  padding: var(--space-sm) var(--space-md);
}
[data-mw-input-field][data-size="lg"] {
  font-size: var(--type-lg);
  padding: var(--space-md) var(--space-md);
}

[data-mw-input-field]:hover:not(:focus):not(:disabled):not(:read-only) {
  border-color: var(--text-positive-tertiary);
}
[data-mw-input-field]:focus {
  border-color: var(--accent-base);
  background: var(--background-positive-primary);
  box-shadow: var(--shadow-focus);
}
[data-mw-input-field]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--background-positive-primary);
}
/* READ-ONLY (v5.5.0). Deliberately NOT disabled's treatment. A disabled field is
   unavailable and drops to 50% opacity, which dims the value along with the control;
   a read-only field still focuses, still copies, still submits, and its value is real
   data the user has to read. So the ink stays at full strength and only the ground and
   the border quieten. Before this, readOnly was a bare native passthrough with no dress
   at all, so an uneditable field was pixel-identical to an editable one. */
[data-mw-input-field]:read-only:not(:disabled) {
  background: var(--background-readonly-wash);
  border-color: var(--border-positive-primary);
  cursor: default;
}
/* Focus still reads normally (it IS focusable), but the quiet ground survives it:
   the base :focus rule repaints the field with the editable ground, which would
   erase the only signal at exactly the moment a keyboard user arrives. */
[data-mw-input-field]:read-only:not(:disabled):focus {
  background: var(--background-readonly-wash);
}
[data-mw-input-field][data-error="true"] {
  border-color: var(--border-error);
}
[data-mw-input-field][data-error="true"]:focus {
  box-shadow: var(--shadow-focus-error);
}
[data-mw-input-field]::placeholder {
  color: var(--text-positive-tertiary);
}

/* Kill the native number-input spinner so the custom stepper buttons on the
   right of NumberField are the only chrome the user sees. Without this the
   browser layers its own spinner on top of ours on hover/focus in Chrome and
   Safari, and Firefox shows a permanent up/down pair. */
[data-mw-input-field][type="number"]::-webkit-inner-spin-button,
[data-mw-input-field][type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
[data-mw-input-field][type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}

[data-mw-input-file]:hover:not([data-disabled="true"]) {
  border-color: var(--text-positive-tertiary);
  color: var(--text-positive-primary);
}
[data-mw-input-file][data-drag-over="true"] {
  background: var(--accent-soft);
  border-color: var(--accent-base);
  border-style: solid;
  color: var(--accent-emphasis);
}
[data-mw-input-file][data-has-file="true"] {
  border-style: solid;
  color: var(--text-positive-primary);
}
[data-mw-input-file][data-error="true"] {
  border-color: var(--border-error);
}
[data-mw-input-file][data-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Keyboard focus on the srOnly file input paints the ring on the ZONE, the thing the user can
   see (27 Aug 2026: the only focusable element here is clipped to 1px, and nothing painted a
   ring for it, the one custom-visual control in the library without one). :has, not the
   sibling form Checkbox uses, because the input is the label's LAST child. An offset outline,
   not a box-shadow: the zone already carries a 2px dashed border and a shadow read as a third. */
[data-mw-input-file]:has(input:focus-visible) {
  outline: var(--focus-outline);
  outline-offset: 2px;
}

[data-mw-input-file-clear]:hover {
  background: var(--background-positive-primary);
  color: var(--text-positive-primary);
}
[data-mw-input-file-clear]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
/* The Clear button lives outside the label now, so it dims with a disabled zone by rule. */
[data-mw-input-file-wrap]:has([data-mw-input-file][data-disabled="true"]) [data-mw-input-file-clear] {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Stepper ink and cursor in the SHEET so :disabled can win (readOnly disables the pair,
   27 Aug 2026; inline values would beat it, the F7 lesson). Tertiary ink, not opacity: the
   field beside them keeps full-strength ink when read-only, so the pair recedes rather than
   fades. */
[data-mw-input-stepper] button {
  color: var(--text-positive-secondary);
  cursor: pointer;
}
[data-mw-input-stepper] button:disabled {
  color: var(--text-positive-tertiary);
  cursor: not-allowed;
}
`;
