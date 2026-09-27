"use client";

import { CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { chartHoverPaint, tokenNumber } from "@/components/internal/styles";
import { percentSpeech, percentText, percentages } from "@/components/internal/percentages";
import { clampTooltipPosition } from "@/components/charts/chartInteraction";

/* ============================================================
   DonutChart — V1 scaffold. A ring of segments sized by value, drawn
   with the stroke-dasharray arc technique so each segment is a single
   rotated <circle>. Segments draw from zero to full arc on mount,
   staggered by --motion-stagger, and on hover lift slightly and deepen
   away from their ground (--chart-hover-shift, D53: this was a
   brightness bump, which lightened in both themes). An optional
   centre label/value sits in the hole; a
   legend lists each segment with its share.

   Shares are integer percentages by largest remainder (the shared
   internal/percentages helper, ChannelSplitBar's too), computed ONCE and
   fed to the legend, the tooltip and the aria-label, so the three always
   agree and always sum to 100. A drawn share under 1% reads "<1%"
   (spoken "less than 1 percent"), never "0%".

   Default segment colours cycle the chart hue tokens (magenta, blue,
   green, red, violet, orange); pass a per-datum color to override.

   Deferred: gap between segments, active-segment explode, nested rings.
   ============================================================ */

interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  /**
   * Formats segment values in the tooltip, e.g. a currency formatter. Absent,
   * values keep toLocaleString. Covers segment values and the tooltip only:
   * percent shares stay percentages, and centerValue is a free prop the
   * formatter never touches.
   */
  formatValue?: (value: number) => string;
}

const HUES = [
  "var(--chart-magenta-1)",
  "var(--chart-blue-1)",
  "var(--chart-green-1)",
  "var(--chart-red-1)",
  "var(--chart-violet-1)",
  "var(--chart-orange-1)",
];

// Default value text for the tooltip when no formatValue is provided
// (byte-for-byte the pre-formatter output).
function formatValueText(n: number): string {
  return n.toLocaleString();
}

export function DonutChart({
  data,
  size = 240,
  thickness = 32,
  centerLabel,
  centerValue,
  formatValue,
}: DonutChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);

  // The `|| 1` guard is for the GEOMETRY only: an all-zero dataset would
  // turn every fraction, and the arc lengths with them, into NaN. The shares
  // take the raw values; the helper returns zeros for an all-zero set.
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const pcts = percentages(data.map((d) => d.value));
  const valueText = formatValue ?? formatValueText;

  // Pad the SVG box ~6% on every side so a segment scaled outward on hover stays
  // inside the viewBox and the SVG's own overflow never clips it. This makes the
  // chart safe to drop into any container, not just frames that allow overflow.
  const pad = Math.round(size * 0.06);
  const boxSize = size + pad * 2;
  const cx = boxSize / 2;
  const cy = boxSize / 2;
  const r = (size - thickness) / 2;
  const outerR = r + thickness / 2;
  const C = 2 * Math.PI * r;

  const segments = data.map((d, i) => {
    const fraction = d.value / total;
    // Prefix sum of earlier values rather than a mutable running total, so the
    // map body stays free of render-time reassignment. n is tiny here.
    const startFraction = data.slice(0, i).reduce((s, p) => s + p.value, 0) / total;
    const startDeg = -90 + startFraction * 360;
    const len = fraction * C;
    // Mid-angle of the segment, measured clockwise from 3 o'clock to match the
    // SVG rotate convention, used to anchor the hover tooltip just outside
    // the ring on that side. clampTooltipPosition takes it from there so the
    // tooltip never bleeds past the chart's own box into the legend beside it
    // (audit, 4 Sep 2026).
    const midRad = ((startDeg + fraction * 180) * Math.PI) / 180;
    return {
      ...d,
      color: d.color ?? HUES[i % HUES.length],
      startDeg,
      len,
      shareText: percentText(pcts[i], d.value),
      tipX: cx + (outerR + 6) * Math.cos(midRad),
      tipY: cy + (outerR + 6) * Math.sin(midRad),
    };
  });

  // Data can shrink while a segment is hovered (a filtered dashboard), so the
  // stored index must never be trusted past the current array (the
  // StackedBarChart guard).
  const hoverSeg = hover !== null ? segments[hover] : undefined;

  // The tooltip's own box (a plain HTML div) is positioned by CSS percentage
  // of this fluid container, but its SIZE comes back from the DOM in real
  // rendered pixels, while `boxSize` is the SVG's internal viewBox unit space
  // — the two only match at 1:1 scale. Convert the tooltip's measured size
  // into viewBox units via the container's actual rendered width before
  // handing it to clampTooltipPosition, so the clamp holds at any width the
  // ResizeObserver-free, purely CSS-fluid box happens to render at.
  useLayoutEffect(() => {
    if (!hoverSeg) {
      setTooltipPos(null);
      return;
    }
    const measure = () => {
      const el = tooltipRef.current;
      const container = containerRef.current;
      if (!el || !container) return;
      const renderedWidth = container.getBoundingClientRect().width;
      const scale = renderedWidth > 0 ? renderedWidth / boxSize : 1;
      const size = { width: el.offsetWidth / scale, height: el.offsetHeight / scale };
      // Bounds are the chart's own box, not the ring: this is what stops the
      // tooltip bleeding past the box edge into the adjacent legend (audit).
      const bounds = { left: 0, top: 0, right: boxSize, bottom: boxSize };
      setTooltipPos(clampTooltipPosition({ x: hoverSeg.tipX, y: hoverSeg.tipY }, size, bounds));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, hoverSeg?.label, hoverSeg?.value, boxSize]);

  return (
    <div style={wrapStyle}>
      <div ref={containerRef} style={{ position: "relative", width: boxSize, maxWidth: "100%", flexShrink: 1 }}>
        <svg
          viewBox={`0 0 ${boxSize} ${boxSize}`}
          role="img"
          // The label carries the data itself: the tooltip is pointer-only and
          // hidden from AT, so this is the whole SR/keyboard story. The same
          // integers as the legend, from the one percentages() call above.
          aria-label={`Donut chart: ${data.map((d, i) => `${d.label} ${percentSpeech(pcts[i], d.value)}`).join(", ")}`}
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          {/* track ring */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--chart-grid-line-color)"
            strokeWidth={thickness}
          />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={hover === i ? chartHoverPaint(s.color) : s.color}
              strokeWidth={thickness}
              strokeDasharray={`${s.len} ${C}`}
              data-mw-donut-seg=""
              style={{
                "--seg-len": String(s.len),
                animationDelay: `calc(var(--motion-stagger) * ${i})`,
                transformBox: "fill-box",
                transformOrigin: "center",
                transform: `rotate(${s.startDeg}deg) scale(${hover === i ? 1.04 : 1})`,
                transition: "transform var(--motion-transition), stroke var(--motion-transition)",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>

        {centerLabel || centerValue !== undefined ? (
          <div style={centerStyle}>
            {centerValue !== undefined ? <span style={centerValueStyle}>{centerValue}</span> : null}
            {centerLabel ? <span style={centerLabelStyle}>{centerLabel}</span> : null}
          </div>
        ) : null}

        {hoverSeg ? (
          <div
            ref={tooltipRef}
            style={{
              ...tooltipStyle,
              // Percentages of the (now fluid) box so the tooltip tracks the ring
              // when the SVG scales down via its viewBox at narrow widths. The
              // position itself (which corner, how far from the anchor) came
              // out of clampTooltipPosition already in viewBox units; here it
              // only needs converting to a percentage of the same box.
              left: `${((tooltipPos?.left ?? hoverSeg.tipX) / boxSize) * 100}%`,
              top: `${((tooltipPos?.top ?? hoverSeg.tipY) / boxSize) * 100}%`,
            }}
            // Pointer-only and unreachable by keyboard, so hidden from AT rather
            // than announced: role="status" on a node created in the same frame
            // as its text is unreliable in both directions (silence on some
            // readers, a burst of fragments on others), and the svg label
            // already speaks every value.
            aria-hidden="true"
          >
            <span style={tooltipLabelStyle}>{hoverSeg.label}</span>
            <span style={tooltipValueStyle}>
              {valueText(hoverSeg.value)} · {hoverSeg.shareText}
            </span>
          </div>
        ) : null}
      </div>

      <ul style={legendStyle} role="list">
        {segments.map((s, i) => (
          <li
            key={i}
            style={legendItemStyle}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span style={{ ...legendSwatchStyle, background: s.color }} />
            <span style={legendLabelStyle}>{s.label}</span>
            <span style={legendPercentStyle}>{s.shareText}</span>
          </li>
        ))}
      </ul>

      <style href="magentaweb-donut-chart" precedence="default">{donutChartCss}</style>
    </div>
  );
}

/* ---------- styles ---------- */

const wrapStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-xl)",
  fontFamily: "var(--chart-font)",
  // Own stacking context so the hover tooltip's z-index stays inside the chart.
  isolation: "isolate",
};

const centerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-3xs)",
  pointerEvents: "none",
};

const centerValueStyle: CSSProperties = {
  fontFamily: "var(--chart-font)",
  fontSize: "var(--type-xl)",
  color: "var(--chart-text-primary)",
  lineHeight: 1,
};

const centerLabelStyle: CSSProperties = {
  fontFamily: "var(--chart-font)",
  fontSize: "var(--chart-legend-label-size)",
  color: "var(--chart-text-secondary)",
};

const tooltipStyle: CSSProperties = {
  position: "absolute",
  // Position is a literal top-left in pixel space (as a % of the fluid box),
  // already clamped by clampTooltipPosition — no CSS transform needed.
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  padding: "var(--space-2xs) var(--space-xs)",
  // Same ground/border pair as BarChart, LineChart and StackedBarChart's
  // tooltips (audit, 4 Sep 2026: this one sat a ground step darker, on a
  // border with half the ink of its three siblings, which agreed with
  // each other and are the ones this aligns to).
  background: "var(--background-positive-primary)",
  border: "1px solid var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
  boxShadow: "var(--shadow-raised)",
  whiteSpace: "nowrap",
  zIndex: 1,
};

const tooltipLabelStyle: CSSProperties = {
  fontFamily: "var(--chart-font)",
  fontSize: "var(--chart-tooltip-size)",
  color: "var(--chart-text-tertiary)",
};

const tooltipValueStyle: CSSProperties = {
  fontFamily: "var(--chart-font)",
  fontSize: "var(--chart-tooltip-size)",
  color: "var(--chart-text-primary)",
  fontWeight: tokenNumber("var(--weight-medium)"),
};

const legendStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-xs)",
};

const legendItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  cursor: "pointer",
};

const legendSwatchStyle: CSSProperties = {
  display: "inline-block",
  width: "0.75rem",
  height: "0.75rem",
  borderRadius: "var(--control-glyph-radius)",
  flexShrink: 0,
};

const legendLabelStyle: CSSProperties = {
  fontFamily: "var(--chart-font)",
  fontSize: "var(--chart-legend-label-size)",
  color: "var(--chart-text-secondary)",
  flex: 1,
};

const legendPercentStyle: CSSProperties = {
  fontFamily: "var(--chart-font)",
  fontSize: "var(--chart-legend-label-size)",
  color: "var(--chart-text-primary)",
  fontWeight: tokenNumber("var(--weight-medium)"),
};

const donutChartCss = `
@keyframes mw-donut-draw {
  from { stroke-dashoffset: var(--seg-len); }
  to   { stroke-dashoffset: 0; }
}
[data-mw-donut-seg] {
  animation: mw-donut-draw var(--motion-draw-duration) var(--motion-ease) both;
}
`;
