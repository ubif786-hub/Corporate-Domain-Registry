"use client";

import {
  ChangeEvent,
  CSSProperties,
  DragEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { CloudUpload, Close, Document } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { ProgressBar } from "@/components/ProgressBar";
import { FieldLabel, resolveMarking, type FieldMarkingKind } from "@/components/FieldLabel";
import { srOnly, tokenNumber } from "@/components/internal/styles";

/* ============================================================
   FileUpload — a dropzone + preview grid for choosing files: drag a
   batch onto the zone or click it to open the native picker, then see
   each pick as a card (an image thumbnail via an object URL, or a
   labelled file chip) with its size, a per-file remove, and an
   optional per-file ProgressBar. accept / multiple / maxSizeMB gate
   what the zone will keep.

   This component only SELECTS and previews. It performs NO network
   upload of its own — the actual transfer is the consumer's job:
   FileUpload hands the current File[] to `onFiles` on every change,
   and the consumer drives the bars back down through `progress`
   (a name -> 0..100 map). So a real integration is: onFiles kicks off
   the consumer's upload, which updates progress as bytes land.

   COMPOSES the mother ProgressBar (per-file bar) and Button (the
   icon-only remove). Client component: it owns the selected-file state,
   the drag-active state, and the object-URL lifecycle (every image URL
   is revoked on remove and on unmount, so nothing leaks).

   A11y: the zone is a real role="button" with an aria-label and
   Enter/Space keyboard activation (the native input is sr-only and
   only opened programmatically, so there is one clear tab stop, not
   two); drag is a pointer enhancement layered on top. With `fieldLabel`
   the zone is named by aria-labelledby from the field label AND its own
   headline, so the visible text is in the name (2.5.3) and a voice user
   can say it; the hint stays out. The focus ring rides the house
   --focus-outline via a hoisted <style> block (a :focus-visible rule
   can't be expressed inline; the Button pattern). Files the zone will
   not keep (failing `accept` or `maxSizeMB`) are listed in a role="alert"
   line under the zone, the sibling fields' error shape, and handed to
   `onReject`; before 27 Aug 2026 they were dropped in silence.
   Removing a card hands keyboard focus to the next card's remove (the
   previous card's when the last one went, the zone when the grid empties)
   instead of letting the unmounting button drop it to <body> (v5.10.0,
   2.4.3). The target only exists after the re-render, so removeAt records
   it and a layout effect focuses it (MultiSelect's synchronous
   inputRef.focus() works only because its input never unmounts).
   ============================================================ */

/** Why the zone declined a file: it failed `accept`, or it is over `maxSizeMB`. */
export type FileUploadRejectReason = "type" | "size";

export interface FileUploadProps {
  /** Called with the full current selection whenever files are added or
   *  removed. The consumer wires the real upload from here (BACKEND). */
  onFiles: (files: File[]) => void;
  /** Called when a pick or drop holds files the zone will not keep, once per
   *  reason present in the batch: "type" for files failing `accept`, "size" for
   *  files over `maxSizeMB`. The zone also lists them in its own role="alert"
   *  line; wire this when the consumer owns a different error surface. */
  onReject?: (files: File[], reason: FileUploadRejectReason) => void;
  /** The native `accept` string (e.g. "image/*,.pdf"). Also enforced on
   *  dropped files, which bypass the picker's own filtering. */
  accept?: string;
  /** Allow more than one file. Default false (a new pick replaces the old). */
  multiple?: boolean;
  /** Reject files larger than this many megabytes. Omit for no size gate. */
  maxSizeMB?: number;
  /** Per-file upload progress, keyed by File.name, each 0..100. A present
   *  entry renders that file's ProgressBar; omit the key for no bar. */
  progress?: Record<string, number>;
  /** The zone's headline / accessible name. Default "Upload files". */
  label?: string;
  /** A quiet line under the label (e.g. "PNG or PDF, up to 5MB"). */
  hint?: string;
  /** The STACKED FIELD LABEL above the zone, in the house label voice (v4.10.2).
   *  Distinct from `label`, which is the headline INSIDE the dropzone: before
   *  this existed a consumer had to hand-roll a div above the control, and the
   *  one that did copied the zone headline styling, so "Photos" read as body
   *  text beside a mono uppercase "ROOM NAME". */
  fieldLabel?: string;
  /** What the field label SHOWS. Requires fieldLabel. */
  marking?: FieldMarkingKind;
  /** Marks the field required: the label carries the mark, and the zone gains a
   *  visually-hidden "required" hint through aria-describedby. ARIA has no
   *  required STATE for a role="button", so the hint is how it is announced,
   *  which is what DatePicker and DateRangePicker already do for the same
   *  reason. There is still no native constraint, so a submit handler must
   *  enforce it. */
  required?: boolean;
}

interface SelectedFile {
  id: string;
  file: File;
  /** Object URL for image previews; undefined for non-images. Revoked on
   *  remove and unmount so the browser reclaims the blob. */
  url?: string;
}

interface RejectedFile {
  name: string;
  reason: FileUploadRejectReason;
}

// The alert line's copy: every declined file by name, with its reason.
function describeRejections(items: RejectedFile[], maxSizeMB?: number): string {
  const parts = items.map(
    (it) => `${it.name} (${it.reason === "type" ? "not an accepted type" : `over ${maxSizeMB} MB`})`,
  );
  return `Not added: ${parts.join(", ")}.`;
}

const isImage = (file: File) => file.type.startsWith("image/");

// Light accept match for DROPPED files (the native picker already filters
// clicks). Matches ".ext", "type/*", and exact "type/subtype" tokens.
function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept.split(",").some((raw) => {
    const token = raw.trim().toLowerCase();
    if (!token) return false;
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

// A calm KB / MB readout for the file's size.
function formatSize(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// The :focus-visible ring can't be expressed from inline CSSProperties, so it
// rides a hoisted sheet (React 19 dedupes by precedence — emitted once). Same
// house keyboard ring as Button/BrandMark.
const fileUploadCss = `
[data-mw-fileupload-zone] { cursor: pointer; }
[data-mw-fileupload-zone]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: 2px;
}
`;

let idSeq = 0;

// Where focus goes after a remove: a surviving card's remove button, or the
// zone when the grid empties. Recorded in removeAt, consumed by the layout
// effect once the survivors are in the DOM.
type PendingFocus = { card: string } | "zone";

export function FileUpload({
  onFiles,
  onReject,
  accept,
  multiple = false,
  maxSizeMB,
  progress,
  label = "Upload files",
  hint,
  fieldLabel,
  marking,
  required = false,
}: FileUploadProps) {
  const labelId = useId();
  const requiredId = `${labelId}-required`;
  // The zone's own headline, so aria-labelledby can name the zone by field label AND visible
  // text (header note); and the rejection line, described to the zone while it shows.
  const headlineId = `${labelId}-headline`;
  const rejectId = `${labelId}-reject`;
  const [items, setItems] = useState<SelectedFile[]>([]);
  // The last pick's declined files. `seq` keys the alert line so a second rejection REMOUNTS
  // it rather than editing the text of a live region already in the tree.
  const [rejection, setRejection] = useState<{ seq: number; items: RejectedFile[] }>({ seq: 0, items: [] });
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const pendingFocusRef = useRef<PendingFocus | null>(null);

  // The focus hand-off, after the commit that removed the card. Layout effect
  // so it lands before paint: no frame with nothing focused, and no flash of
  // a ring on the wrong element. Cleared first so a later items change (a new
  // pick) never replays a stale target.
  useLayoutEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    const target =
      pending === "zone"
        ? zoneRef.current
        : gridRef.current?.querySelector<HTMLElement>(
            `[data-mw-fileupload-remove="${pending.card}"]`,
          ) ?? null;
    target?.focus({ preventScroll: true });
  }, [items]);

  // Mirror the live items so the unmount cleanup revokes every URL without
  // re-subscribing on each change.
  const itemsRef = useRef<SelectedFile[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(
    () => () => {
      itemsRef.current.forEach((it) => it.url && URL.revokeObjectURL(it.url));
    },
    [],
  );

  const maxBytes = maxSizeMB != null ? maxSizeMB * 1024 * 1024 : undefined;

  // Both mutation paths (addFiles here, removeAt below) compute `next` from
  // the committed items in the event handler, then run setItems, onFiles, and
  // the URL revocations as siblings. These used to live inside the setItems
  // updater, but an updater must be pure and React is free to re-invoke it
  // (StrictMode runs every updater twice in dev), so the consumer's upload
  // kicked off twice per pick and revocations ran once per updater invocation
  // instead of once per removed item. Reading `items` from the render closure
  // is sound: each path runs from a discrete user event, so the closure holds
  // the committed selection.
  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const all = Array.from(incoming);
      const wrongType = all.filter((f) => !matchesAccept(f, accept));
      const tooBig = all.filter((f) => matchesAccept(f, accept) && maxBytes != null && f.size > maxBytes);
      const accepted = all.filter((f) => !wrongType.includes(f) && !tooBig.includes(f));
      // Every rejection speaks (27 Aug 2026). Before this the filter threw files away with no
      // message, no live region and no error state, so a 12 MB scan on a 5 MB zone read as a
      // broken site and three oversized files in a ten-file drag vanished unnamed. The list is
      // replaced on every pick, so it clears itself the next time a batch is clean.
      setRejection((prev) => ({
        seq: prev.seq + 1,
        items: [
          ...wrongType.map((f) => ({ name: f.name, reason: "type" as const })),
          ...tooBig.map((f) => ({ name: f.name, reason: "size" as const })),
        ],
      }));
      if (wrongType.length) onReject?.(wrongType, "type");
      if (tooBig.length) onReject?.(tooBig, "size");
      if (accepted.length === 0) return;

      const built: SelectedFile[] = accepted.map((file) => ({
        id: `mw-file-${idSeq++}`,
        file,
        url: isImage(file) ? URL.createObjectURL(file) : undefined,
      }));

      // Single-file mode: the new pick replaces the old. Revoke the outgoing
      // URLs, and the extras we drop when more than one arrived, so they
      // don't leak.
      if (!multiple) {
        const next = built.slice(0, 1);
        items.forEach((it) => it.url && URL.revokeObjectURL(it.url));
        built.slice(1).forEach((it) => it.url && URL.revokeObjectURL(it.url));
        setItems(next);
        // consumer wires the real upload (BACKEND)
        onFiles(next.map((it) => it.file));
        return;
      }

      const next = [...items, ...built];
      setItems(next);
      // consumer wires the real upload (BACKEND)
      onFiles(next.map((it) => it.file));
    },
    [accept, maxBytes, multiple, items, onFiles, onReject],
  );

  const removeAt = useCallback(
    (id: string) => {
      const index = items.findIndex((it) => it.id === id);
      const gone = index >= 0 ? items[index] : undefined;
      const next = items.filter((it) => it.id !== id);
      // Focus hand-off (see the header): the heir is the card that now sits
      // at this index (the next one), else the previous, else the zone. Only
      // when focus is actually in the grid: a pointer click in Safari never
      // focused the button, and focus elsewhere on the page stays put.
      if (gridRef.current?.contains(document.activeElement)) {
        const heir = next[index] ?? next[index - 1];
        pendingFocusRef.current = heir ? { card: heir.id } : "zone";
      }
      setItems(next);
      onFiles(next.map((it) => it.file));
      // Revoke exactly the removed item's URL, after the state write, so the
      // blob is reclaimed once and only for the item that actually left.
      if (gone?.url) URL.revokeObjectURL(gone.url);
    },
    [items, onFiles],
  );

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    // Reset so re-picking the same file fires change again.
    e.target.value = "";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dragActive) setDragActive(true);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only clear when the pointer actually leaves the zone, not on child cross.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragActive(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div style={rootStyle}>
      <style href="magentaweb-fileupload" precedence="default">
        {fileUploadCss}
      </style>

      {fieldLabel ? (
        <FieldLabel as="span" id={labelId} marking={resolveMarking(marking, required)}>
          {fieldLabel}
        </FieldLabel>
      ) : null}

      {required ? (
        <span id={requiredId} style={srOnly}>required</span>
      ) : null}

      <div
        ref={zoneRef}
        data-mw-fileupload-zone=""
        role="button"
        tabIndex={0}
        aria-label={fieldLabel ? undefined : label}
        aria-labelledby={fieldLabel ? `${labelId} ${headlineId}` : undefined}
        aria-describedby={
          [required ? requiredId : null, rejection.items.length ? rejectId : null].filter(Boolean).join(" ") || undefined
        }
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{ ...zoneStyle, ...(dragActive ? zoneActiveStyle : null) }}
      >
        <span style={zoneIconStyle} aria-hidden="true">
          <Icon size="lg">
            <CloudUpload />
          </Icon>
        </span>
        <span id={headlineId} style={zoneLabelStyle}>{label}</span>
        {hint ? <span style={zoneHintStyle}>{hint}</span> : null}
      </div>

      {/* The real control: sr-only and opened only via the zone, so there is a
          single tab stop. aria-hidden + tabIndex -1 keep it off the tab order. */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onInputChange}
        tabIndex={-1}
        aria-hidden="true"
        style={srOnly}
      />

      {rejection.items.length > 0 ? (
        <p key={rejection.seq} id={rejectId} role="alert" data-mw-fileupload-reject="" style={rejectStyle}>
          {describeRejections(rejection.items, maxSizeMB)}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul ref={gridRef} style={gridStyle} role="list">
          {items.map((it) => {
            const pct = progress?.[it.file.name];
            return (
              <li key={it.id} style={cardStyle}>
                <div style={thumbStyle}>
                  {it.url ? (
                    // Decorative: the file name below carries the accessible label.
                    <img src={it.url} alt="" style={thumbImageStyle} />
                  ) : (
                    <span style={thumbGlyphStyle} aria-hidden="true">
                      <Icon size="lg">
                        <Document />
                      </Icon>
                    </span>
                  )}
                </div>

                <div style={metaRowStyle}>
                  <span style={metaTextStyle}>
                    <span style={fileNameStyle} title={it.file.name}>
                      {it.file.name}
                    </span>
                    <span style={fileSizeStyle}>{formatSize(it.file.size)}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={<Close size={16} />}
                    aria-label={`Remove ${it.file.name}`}
                    data-mw-fileupload-remove={it.id}
                    onClick={() => removeAt(it.id)}
                  />
                </div>

                {pct != null ? (
                  <ProgressBar
                    value={pct}
                    ariaLabel={`Uploading ${it.file.name}`}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/* ---------- inline styles (token-pure) ---------- */

const rootStyle: CSSProperties = {
  // The srOnly file input's containing block (see the contract in
  // internal/styles.ts).
  position: "relative",
  display: "flex",
  flexDirection: "column",
  // 2xs, the field-shell bind every other field uses (v5.5.0: was sm, the one outlier).
  gap: "var(--space-2xs)",
  width: "100%",
  minWidth: 0,
};

// The dropzone: a dashed invitation. v4.8.0: the old 1px dash on the faint
// border token was too weak to read as a dropzone (a defect in any product) —
// now 2px in the tertiary INK, clearly visible without shouting, theme-mirrored.
// Radius, wash, and the accent active state are unchanged.
// AUD-6 (4 Sep 2026): the 2px was a raw literal; --rule-weight-strong holds
// the identical value (--raw-hairline-strong) and is the token Divider's own
// step above the plain hairline already uses, so this reads from the same
// rung rather than a hand-typed one that happens to match it today.
const zoneStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  gap: "var(--space-2xs)",
  padding: "var(--space-xl) var(--space-lg)",
  border: "var(--rule-weight-strong) dashed var(--text-positive-tertiary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-secondary)",
  color: "var(--text-positive-secondary)",
  transition:
    "border-color var(--motion-transition), background var(--motion-transition)",
};

const zoneActiveStyle: CSSProperties = {
  borderColor: "var(--accent-base)",
  background: "var(--accent-wash)",
};

const zoneIconStyle: CSSProperties = {
  display: "inline-flex",
  color: "var(--accent-ink)",
};

const zoneLabelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  color: "var(--text-positive-primary)",
};

const zoneHintStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-tertiary)",
};

// The rejection line: the sibling fields' error line, verbatim (Input's errorStyle).
const rejectStyle: CSSProperties = {
  margin: 0,
  marginTop: "var(--space-2xs)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--status-danger-text)",
};

// Auto-fill grid so cards flow to the container's width. 9rem: the preview
// card's minimum track — structural geometry, the ProgressBar bar-height
// precedent for a sanctioned rem literal. Checked at AUD-6 (4 Sep 2026):
// tokens.css holds no token at 9rem (or 144px), so there is nothing to swap
// this for; it is a grid-track minimum (a layout decision, like a
// breakpoint), not a visual size.
const gridStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
  gap: "var(--space-sm)",
  minWidth: 0,
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  padding: "var(--space-2xs)",
  border: "1px solid var(--border-positive-primary)",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-primary)",
  minWidth: 0,
};

// Square preview well: aspect-ratio keeps it 1:1 as the track flexes.
const thumbStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  borderRadius: "var(--component-radius)",
  background: "var(--background-positive-secondary)",
};

const thumbImageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const thumbGlyphStyle: CSSProperties = {
  display: "inline-flex",
  color: "var(--text-positive-tertiary)",
};

const metaRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-2xs)",
  minWidth: 0,
};

const metaTextStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  minWidth: 0,
};

const fileNameStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-primary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  minWidth: 0,
};

const fileSizeStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--tracking-snug)",
  color: "var(--text-positive-tertiary)",
  fontVariantNumeric: "tabular-nums",
};
