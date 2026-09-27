"use client";

// Lightbox — a uniform grid of image thumbnails that open a full-screen overlay you step through, for
// bare photo sets (a listing's rooms, product shots, a portfolio). Built on the same overlay contract
// as Modal (useDialogOverlay: focus trap, scroll lock, Escape, background inert) plus arrow keys and
// touch swipe, with looping navigation. Token-pure: every on-scrim control carries its own themed
// surface (a pill or a circular button) so the themed text/icon tokens stay readable over the fixed
// dark scrim in both light and dark. The images come from a typed GalleryImage[] (src, alt, optional
// caption); a manifest is the usual source. For items that carry a title, description, and a link,
// use Card in a grid instead: that is a card grid, not a photo gallery.

import {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import { ChevronLeft, ChevronRight, Close } from "@carbon/icons-react";
import { Image } from "@/components/Image";
import { useDialogOverlay } from "@/components/useDialogOverlay";
import { FocusSentinel } from "@/components/internal/FocusSentinel";

export interface GalleryImage {
  src: string;
  alt: string;
  /** Shown under the enlarged image; also feeds the thumbnail's accessible name. */
  caption?: string;
}

export interface LightboxProps {
  images: GalleryImage[];
  /** Columns at desktop. Tablet uses min(columns, 3); mobile is 2. Default 3. */
  columns?: 2 | 3 | 4;
  /** Thumbnail crop aspect (the enlarged view is never cropped). Default "square". */
  thumbAspect?: "square" | "wide" | "tall";
  /** Accessible label for the gallery region and the dialog. */
  label?: string;
  /** Eager-load the first row of thumbnails, for a gallery placed above the fold (better LCP).
   *  Default false: every thumbnail lazy-loads, the right choice for a gallery below the fold or a
   *  large set. */
  priority?: boolean;
}

// The trap's focusable set is the hook's DIALOG_FOCUSABLE_SELECTOR (hoisted in pass 4, 27 Aug
// 2026, from the verbatim copy that sat here); containment past an <iframe> is the FocusSentinel
// pair at the scrim's edges (the scrim is the trap root, see the overlay JSX).

// Swipe threshold in px; a horizontal drag past this steps the image.
const SWIPE_MIN = 45;

// @media cannot read custom properties, so the breakpoint px are hardcoded with the token cited, per
// the breakpoint rule. The column counts ARE custom properties (allowed inside grid-template-columns).
const lightboxCss = `
[data-mw-lb-grid] {
  display: grid;
  gap: var(--space-sm);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  /* Fill the container: minmax(0, 1fr) columns collapse to zero width in a shrink-to-fit parent (a
     flex/inline-flex box that does not stretch its child), which would give the aspect-ratio
     thumbnails zero height. width:100% keeps the grid full-width in any container. */
  width: 100%;
  list-style: none;
  margin: 0;
  padding: 0;
}
@media (min-width: 768px) { /* --mw-bp-tablet */
  [data-mw-lb-grid] { grid-template-columns: repeat(var(--mw-lb-cols-md, 3), minmax(0, 1fr)); }
}
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-lb-grid] { grid-template-columns: repeat(var(--mw-lb-cols, 3), minmax(0, 1fr)); }
}
[data-mw-lb-thumb] {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: var(--component-radius);
  overflow: hidden;
}
[data-mw-lb-thumb] img { transition: transform var(--motion-duration) var(--motion-ease); }
[data-mw-lb-thumb]:hover img { transform: scale(1.04); }
[data-mw-lb-thumb]:focus-visible { outline: var(--focus-outline); outline-offset: 2px; }

[data-mw-lb-scrim] {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  /* Shared overlay treatment with Modal: a theme-mirrored frosted veil plus a backdrop blur. */
  background: var(--modal-scrim);
  backdrop-filter: blur(var(--overlay-blur));
  -webkit-backdrop-filter: blur(var(--overlay-blur));
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--motion-duration) var(--motion-ease);
}
[data-mw-lb-scrim][data-open="true"] { opacity: 1; pointer-events: auto; }

[data-mw-lb-figure] {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  max-width: 100%;
  transform: scale(0.985);
  transition: transform var(--motion-duration) var(--motion-ease);
}
[data-mw-lb-scrim][data-open="true"] [data-mw-lb-figure] { transform: scale(1); }

[data-mw-lb-imagebox] {
  position: relative;
  /* Viewport-relative enlarged-image frame caps: deliberate fixed maxima,
     independent of the breakpoint ladder. */
  width: min(92vw, 1400px);
  height: min(80vh, 900px);
}
[data-mw-lb-imagebox] img { object-fit: contain; }

[data-mw-lb-btn] {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--control-size-touch);
  height: var(--control-size-touch);
  padding: 0;
  border-radius: var(--radius-full);
  background: var(--background-positive-primary);
  color: var(--text-positive-primary);
  border: 1px solid var(--border-positive-primary);
  box-shadow: var(--shadow-raised);
  cursor: pointer;
  transition:
    background var(--motion-duration) var(--motion-ease),
    color var(--motion-duration) var(--motion-ease);
}
[data-mw-lb-btn]:hover { background: var(--background-positive-secondary); }
[data-mw-lb-btn]:focus-visible { outline: var(--focus-outline); outline-offset: 2px; }
[data-mw-lb-close] { top: var(--space-lg); right: var(--space-lg); }
[data-mw-lb-prev] { left: var(--space-md); top: 50%; transform: translateY(-50%); }
[data-mw-lb-next] { right: var(--space-md); top: 50%; transform: translateY(-50%); }

[data-mw-lb-counter] {
  position: absolute;
  top: var(--space-lg);
  left: var(--space-lg);
  padding: var(--space-2xs) var(--space-sm);
  border-radius: var(--radius-full);
  background: var(--background-positive-primary);
  color: var(--text-positive-secondary);
  border: 1px solid var(--border-positive-primary);
  font-family: var(--font-code);
  font-size: var(--type-xs);
  line-height: 1;
}
[data-mw-lb-caption] {
  margin: 0;
  max-width: min(90vw, var(--measure-prose)); /* was 60ch: the reading measure (pass 4, 27 Aug 2026) */
  text-align: center;
  padding: var(--space-2xs) var(--space-md);
  border-radius: var(--component-radius);
  background: var(--background-positive-primary);
  color: var(--text-positive-secondary);
  border: 1px solid var(--border-positive-primary);
  font-family: var(--font-body);
  font-size: var(--type-sm);
  line-height: var(--leading-snug);
}
`;

export function Lightbox({ images, columns = 3, thumbAspect = "square", label = "Image gallery", priority = false }: LightboxProps) {
  const [mounted, setMounted] = useState(false);
  // open + index are separate so the current image stays mounted through the close transition (the
  // scrim keeps its last image while it fades out), matching Modal's always-mounted overlay.
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  // Gate the full-size enlarged image on the first open so the closed overlay does not load a 100vw
  // image on page mount (it is position:fixed, so it counts as in-viewport). Stays true after, so the
  // exit transition keeps its image.
  const [hasOpened, setHasOpened] = useState(false);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const pointerDownOnScrimRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);

  const count = images.length;

  const close = useCallback(() => setOpen(false), []);
  const openAt = useCallback((i: number) => {
    setHasOpened(true);
    setIndex(i);
    setOpen(true);
  }, []);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only gate: createPortal targets are client-only, so render the overlay only after hydration.
    setMounted(true);
  }, []);

  // Scroll lock + focus trap + Escape + background inert, via the shared overlay contract. The scrim
  // is both the dialog and the trap root, so the edge-positioned prev/next/close all stay trapped.
  useDialogOverlay({
    open,
    trapRef: scrimRef,
    initialFocusRef: scrimRef,
    onClose: close,
    inertTarget: () => document.getElementById("mw-app-root"),
  });

  // Left/Right arrows step the image while open (loop). Separate from the overlay hook's Esc/Tab
  // handler; keyed on open + count so it re-binds if the set changes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => (i + 1) % count);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => (i - 1 + count) % count);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, count]);

  if (count === 0) return null;

  const gridStyle = {
    "--mw-lb-cols": String(columns),
    "--mw-lb-cols-md": String(Math.min(columns, 3)),
  } as CSSProperties;

  // Desktop term follows the actual column count (25vw under a 2-column grid
  // served thumbs ~half the rendered width; audit). Tablet caps at 3 columns
  // (--mw-lb-cols-md), mobile is always 2.
  const thumbSizes = `(min-width: 1024px) ${Math.round(100 / columns)}vw, (min-width: 768px) ${Math.round(100 / Math.min(columns, 3))}vw, 50vw`;

  const grid = (
    <ul data-mw-lb-grid="" style={gridStyle} role="list">
      {images.map((img, i) => (
        <li key={`${img.src}-${i}`}>
          <button
            type="button"
            data-mw-lb-thumb=""
            aria-label={`View image ${i + 1} of ${count}${img.caption ? `: ${img.caption}` : img.alt ? `: ${img.alt}` : ""}`}
            aria-haspopup="dialog"
            onClick={() => openAt(i)}
          >
            <Image src={img.src} alt="" aspect={thumbAspect} fit="cover" sizes={thumbSizes} priority={priority && i < columns} />
          </button>
        </li>
      ))}
    </ul>
  );

  // Backdrop dismiss: require the press to have STARTED on the scrim too, so a drag that slips onto
  // the scrim does not close (same guard as Modal).
  const onScrimMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    pointerDownOnScrimRef.current = e.target === e.currentTarget;
  };
  const onScrimClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && pointerDownOnScrimRef.current) close();
    pointerDownOnScrimRef.current = false;
  };

  const onTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStartXRef.current;
    touchStartXRef.current = null;
    if (start == null) return;
    const delta = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < SWIPE_MIN) return;
    if (delta < 0) next();
    else prev();
  };

  const current = images[index];

  const overlay = (
    <div
      ref={scrimRef}
      data-mw-lb-scrim=""
      data-open={open ? "true" : "false"}
      data-lenis-prevent=""
      inert={!open}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={onScrimMouseDown}
      onClick={onScrimClick}
    >
      <FocusSentinel edge="start" trapRef={scrimRef} />
      <span data-mw-lb-counter="" aria-live="polite">
        {index + 1} / {count}
      </span>
      <button type="button" data-mw-lb-btn="" data-mw-lb-close="" aria-label="Close gallery" onClick={close}>
        <Close size={24} />
      </button>
      {count > 1 && (
        <>
          <button type="button" data-mw-lb-btn="" data-mw-lb-prev="" aria-label="Previous image" onClick={prev}>
            <ChevronLeft size={24} />
          </button>
          <button type="button" data-mw-lb-btn="" data-mw-lb-next="" aria-label="Next image" onClick={next}>
            <ChevronRight size={24} />
          </button>
        </>
      )}
      {hasOpened && (
        <figure data-mw-lb-figure="">
          <div data-mw-lb-imagebox="" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {/* Eager: the enlarged image only renders after the user opens the lightbox, so it is the
                focal content and should load immediately (also marks it as the intended LCP). Next 16
                next/image uses `preload`, not `priority`. */}
            <NextImage src={current.src} alt={current.alt} fill sizes="100vw" preload />
          </div>
          {current.caption && <figcaption data-mw-lb-caption="">{current.caption}</figcaption>}
        </figure>
      )}
      <FocusSentinel edge="end" trapRef={scrimRef} />
    </div>
  );

  return (
    <>
      <style href="magentaweb-lightbox" precedence="default">
        {lightboxCss}
      </style>
      {grid}
      {mounted && createPortal(overlay, document.body)}
    </>
  );
}
