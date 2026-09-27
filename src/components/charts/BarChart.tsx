"use client";

import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { chartHoverPaint, tokenNumber } from "@/components/internal/styles";
import { clampTooltipPosition, readTabletBreakpoint } from "@/components/charts/chartInteraction";

/* ============================================================
   BarChart — V1 scaffold. A single series of categorical bars,
   vertical (default) or horizontal. Bars grow from the baseline on
   mount, staggered by --motion-stagger per index, and deepen away from
   their ground with a tooltip on hover (--chart-hover-shift, D53: the
   hover was a brightness filter, which lightened in both themes).
   Pixel-space rendering via ResizeObserver, the same
   approach as LineChart, so the value-axis grid and tooltip line up
   exactly. Colour and type come from --chart-* tokens.

   Deferred: grouped / stacked series, negative-value baselines beyond
   zero, value-label annotations on bars.
   ============================================================ */

interface BarPoint {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarPoint[];
  series?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  orientation?: "vertical" | "horizontal";
  color?: string;
  /**
   * Formats every numeric surface (axis ticks, tooltip value, accessible-label
   * values), e.g. a currency formatter for a money axis. Absent, ticks keep
   * the built-in k-abbreviation and values keep toLocaleString.
   */
  formatValue?: (value: number) => string;
}

const V_MARGIN = { top: 16, right: 16, bottom: 32, left: 48 };
const H_MARGIN = { top: 16, right: 16, bottom: 32, left: 96 };
const TICKS = 4;

function formatTick(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(Math.round(n * 100) / 100);
}

// Default value text for the tooltip and the accessible label when no
// formatValue is provided (byte-for-byte the pre-formatter output).
function formatValueText(n: number): string {
  return n.toLocaleString();
}

export function BarChart({
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = false,
  orientation = "vertical",
  color = "var(--chart-magenta-1)",
  formatValue,
}: BarChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);
  // Mobile category-label thinning (A2, owner decision 5 Sep 2026): read once
  // on mount so SSR and the first paint agree; the width state below is what
  // actually drives the thinning per resize.
  const [tabletBp, setTabletBp] = useState(768);

  useEffect(() => {
    setTabletBp(readTabletBreakpoint());
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      // Accept 0 too: a chart in a hidden tab measures 0, and discarding it
      // left the 640 SSR fallback stuck until some later nonzero resize (audit).
      if (w !== undefined) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const horizontal = orientation === "horizontal";
  const MARGIN = horizontal ? H_MARGIN : V_MARGIN;
  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const values = data.map((d) => d.value);
  const maxV = Math.max(...values, 0);
  const valueTicks = Array.from({ length: TICKS + 1 }, (_, i) => (maxV * i) / TICKS);

  // One formatter per numeric voice: formatValue, when provided, takes over
  // both; otherwise ticks abbreviate and values localise as before.
  const tickText = formatValue ?? formatTick;
  const valueText = formatValue ?? formatValueText;

  // Geometry per bar. The grow animation always runs along the value axis.
  const n = data.length || 1;
  const bars = data.map((d, i) => {
    if (horizontal) {
      const band = plotH / n;
      const barH = band * 0.6;
      const yPos = MARGIN.top + band * i + (band - barH) / 2;
      const w = maxV === 0 ? 0 : (d.value / maxV) * plotW;
      return { x: MARGIN.left, y: yPos, w, h: barH };
    }
    const band = plotW / n;
    const barW = band * 0.6;
    const xPos = MARGIN.left + band * i + (band - barW) / 2;
    const h = maxV === 0 ? 0 : (d.value / maxV) * plotH;
    return { x: xPos, y: MARGIN.top + plotH - h, w: barW, h };
  });

  const valuePos = (v: number) =>
    horizontal
      ? MARGIN.left + (maxV === 0 ? 0 : (v / maxV) * plotW)
      : MARGIN.top + plotH - (maxV === 0 ? 0 : (v / maxV) * plotH);

  // Data can shrink while a bar is hovered (a filtered dashboard), so the
  // stored index must never be trusted past the current array (the
  // StackedBarChart guard).
  const hoverBar = hover !== null ? bars[hover] : undefined;
  const hoverDatum = hover !== null ? data[hover] : undefined;

  // Below tablet, every second category label renders (vertical orientation
  // only — horizontal's category axis is a row per item, not spaced by
  // width, so it doesn't hit this collision). Dropped labels stay fully
  // present in the tooltip (every bar keeps its hover target) and the
  // aria-label above.
  const isNarrow = !horizontal && width > 0 && width < tabletBp;

  useLayoutEffect(() => {
    if (!hoverBar) {
      setTooltipPos(null);
      return;
    }
    const el = tooltipRef.current;
    if (!el) return;
    const anchor = { x: hoverBar.x + hoverBar.w / 2, y: hoverBar.y };
    const bounds = { left: MARGIN.left, top: MARGIN.top, right: MARGIN.left + plotW, bottom: MARGIN.top + plotH };
    setTooltipPos(clampTooltipPosition(anchor, { width: el.offsetWidth, height: el.offsetHeight }, bounds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, hoverDatum?.label, hoverDatum?.value, width, height, horizontal]);

  return (
    <div ref={ref} style={wrapStyle}>
      {showLegend && series ? (
        <div style={legendStyle}>
          <span style={{ ...legendSwatchStyle, background: color }} />
          <span style={legendLabelStyle}>{series}</span>
        </div>
      ) : null}

      <div style={{ position: "relative" }}>
        <svg
          width={width}
          height={height}
          role="img"
          // The label carries the data itself (same contract as DonutChart):
          // the tooltip is hover-only, so this is the whole SR/keyboard story.
          aria-label={`${series ? `Bar chart: ${series}` : "Bar chart"}. ${data
            .map((d) => `${d.label} ${valueText(d.value)}`)
            .join(", ")}.`}
          // maxWidth caps the pre-measure 640 SSR fallback so it can never
          // overflow a narrower container before ResizeObserver fires (audit).
          style={{ display: "block", maxWidth: "100%" }}
        >
          {/* value-axis grid lines */}
          {showGrid
            ? valueTicks.map((t, i) =>
                horizontal ? (
                  <line
                    key={i}
                    x1={valuePos(t)}
                    x2={valuePos(t)}
                    y1={MARGIN.top}
                    y2={MARGIN.top + plotH}
                    stroke="var(--chart-grid-line-color)"
                    strokeWidth={1}
                  />
                ) : (
                  <line
                    key={i}
                    x1={MARGIN.left}
                    x2={MARGIN.left + plotW}
                    y1={valuePos(t)}
                    y2={valuePos(t)}
                    stroke="var(--chart-grid-line-color)"
                    strokeWidth={1}
                  />
                ),
              )
            : null}

          {/* baseline + category axis */}
          {/* THE LEFT AXIS IS ALWAYS VERTICAL (visual audit, 30 Aug 2026). This line ran
              x2={horizontal ? MARGIN.left : MARGIN.left + plotW}, so in the DEFAULT vertical
              orientation it went from the plot's top-left to its bottom-RIGHT: a hairline
              drawn diagonally across the chart, through every bar, on every bar-chart demo
              and every consumer. It read as a faint stray rule rather than an axis, which is
              probably why it survived; nothing measures whether a line is where it should be.
              A left-edge axis runs top to bottom at MARGIN.left in both orientations. */}
          <line
            x1={MARGIN.left}
            x2={MARGIN.left}
            y1={MARGIN.top}
            y2={MARGIN.top + plotH}
            stroke="var(--chart-axis-line-color)"
            strokeWidth={1}
          />
          <line
            x1={MARGIN.left}
            x2={MARGIN.left + plotW}
            y1={MARGIN.top + plotH}
            y2={MARGIN.top + plotH}
            stroke="var(--chart-axis-line-color)"
            strokeWidth={1}
          />

          {/* value tick labels */}
          {valueTicks.map((t, i) =>
            horizontal ? (
              <text
                key={i}
                x={valuePos(t)}
                y={MARGIN.top + plotH + 18}
                textAnchor="middle"
                fill="var(--chart-text-tertiary)"
                style={axisLabelTextStyle}
              >
                {tickText(t)}
              </text>
            ) : (
              <text
                key={i}
                x={MARGIN.left - 8}
                y={valuePos(t)}
                textAnchor="end"
                dominantBaseline="central"
                fill="var(--chart-text-tertiary)"
                style={axisLabelTextStyle}
              >
                {tickText(t)}
              </text>
            ),
          )}

          {/* category labels */}
          {data.map((d, i) =>
            horizontal ? (
              <text
                key={i}
                x={MARGIN.left - 8}
                y={bars[i].y + bars[i].h / 2}
                textAnchor="end"
                dominantBaseline="central"
                fill="var(--chart-text-tertiary)"
                style={axisLabelTextStyle}
              >
                {d.label}
              </text>
            ) : isNarrow && i % 2 !== 0 ? null : (
              <text
                key={i}
                x={bars[i].x + bars[i].w / 2}
                y={MARGIN.top + plotH + 18}
                textAnchor="middle"
                fill="var(--chart-text-tertiary)"
                style={axisLabelTextStyle}
              >
                {d.label}
              </text>
            ),
          )}

          {/* bars */}
          {bars.map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill={hover === i ? chartHoverPaint(color) : color}
              data-mw-bar={horizontal ? "h" : "v"}
              style={{
                animationDelay: `calc(var(--motion-stagger) * ${i})`,
                transition: "fill var(--motion-transition)",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>

        {hoverBar && hoverDatum ? (
          <div
            ref={tooltipRef}
            style={{
              ...tooltipStyle,
              left: tooltipPos?.left ?? hoverBar.x + hoverBar.w / 2,
              top: tooltipPos?.top ?? hoverBar.y,
            }}
            // Pointer-only and unreachable by keyboard, so hidden from AT rather
            // than announced: role="status" on a node created in the same frame
            // as its text is unreliable in both directions (silence on some
            // readers, a burst of fragments on others), and the svg label
            // already speaks every value.
            aria-hidden="true"
          >
            <span style={tooltipLabelStyle}>{hoverDatum.label}</span>
            <span style={tooltipValueStyle}>{valueText(hoverDatum.value)}</span>
          </div>
        ) : null}
      </div>

      <style href="magentaweb-bar-chart" precedence="default">{barChartCss}</style>
    </div>
  );
}

/* ---------- styles ---------- */

const wrapStyle: CSSProperties = {
  width: "100%",
  fontFamily: "var(--chart-font)",
  // Own stacking context so the hover tooltip's z-index stays inside the chart.
  isolation: "isolate",
};

const axisLabelTextStyle: CSSProperties = {
  fontFamily: "var(--chart-font)",
  fontSize: "var(--chart-axis-label-size)",
};

const legendStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-xs)",
  marginBottom: "var(--space-sm)",
};

const legendSwatchStyle: CSSProperties = {
  display: "inline-block",
  width: "0.75rem",
  height: "0.75rem",
  borderRadius: "var(--control-glyph-radius)",
};

const legendLabelStyle: CSSProperties = {
  fontFamily: "var(--chart-font)",
  fontSize: "var(--chart-legend-label-size)",
  color: "var(--chart-text-secondary)",
};

const tooltipStyle: CSSProperties = {
  position: "absolute",
  // Position is a literal top-left in pixel space, already clamped and
  // centered/flipped by clampTooltipPosition — no CSS transform needed.
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  padding: "var(--space-2xs) var(--space-xs)",
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

const barChartCss = `
@keyframes mw-bar-grow-v {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
@keyframes mw-bar-grow-h {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
[data-mw-bar] {
  transform-box: fill-box;
}
[data-mw-bar="v"] {
  transform-origin: bottom;
  animation: mw-bar-grow-v var(--motion-draw-duration) var(--motion-ease) both;
}
[data-mw-bar="h"] {
  transform-origin: left;
  animation: mw-bar-grow-h var(--motion-draw-duration) var(--motion-ease) both;
}
`;
