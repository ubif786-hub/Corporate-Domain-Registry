"use client";

import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { tokenNumber } from "@/components/internal/styles";
import { clampTooltipPosition, readTabletBreakpoint } from "@/components/charts/chartInteraction";

/* ============================================================
   LineChart — V1 scaffold. A single series plotted as a path over a
   value axis and a category axis, with optional grid, optional smooth
   (monotone-ish) interpolation, a mount draw animation, and an
   on-hover point tooltip.

   Rendering is pixel-space, not viewBox-scaled: a ResizeObserver feeds
   the measured container width so strokes stay crisp and the HTML
   tooltip maps to exact coordinates. All colour and type come from the
   --chart-* tokens, so the chart follows the theme dial. The draw
   animation rides --motion-draw-duration (the slow, deliberate ~3x
   progressive-draw pace shared with the count-up) and collapses to
   instant under the global reduced-motion override.

   Deferred to a later pass: multiple series, log scale, axis-tick
   niceing beyond the linear split, brush / zoom.
   ============================================================ */

interface LinePoint {
  label: string;
  value: number;
}

export interface LineChartProps {
  data: LinePoint[];
  series?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  smooth?: boolean;
  color?: string;
  /**
   * Formats every numeric surface (axis ticks, tooltip value, accessible-label
   * values), e.g. a currency formatter for a money axis. Absent, ticks keep
   * the built-in k-abbreviation and values keep toLocaleString.
   */
  formatValue?: (value: number) => string;
}

const MARGIN = { top: 16, right: 16, bottom: 32, left: 48 };
const Y_TICKS = 4;

function formatTick(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(Math.round(n * 100) / 100);
}

// Default value text for the tooltip and the accessible label when no
// formatValue is provided (byte-for-byte the pre-formatter output).
function formatValueText(n: number): string {
  return n.toLocaleString();
}

// Catmull-Rom to cubic Bezier: a smooth curve that passes through every
// point without the overshoot a naive spline introduces.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function linearPath(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export function LineChart({
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = false,
  smooth = false,
  color = "var(--chart-magenta-1)",
  formatValue,
}: LineChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);
  // Mobile category-label thinning (A2, owner decision 5 Sep 2026): read once
  // on mount so SSR and the first paint agree, then never again — the same
  // width state below is what actually drives the thinning per resize.
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

  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const values = data.map((d) => d.value);
  const maxV = Math.max(...values, 0);
  const minV = Math.min(...values, 0);
  const span = maxV - minV || 1;

  const x = (i: number) =>
    MARGIN.left + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => MARGIN.top + plotH - ((v - minV) / span) * plotH;

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const path = smooth ? smoothPath(pts) : linearPath(pts);

  const ticks = Array.from({ length: Y_TICKS + 1 }, (_, i) => minV + (span * i) / Y_TICKS);

  // One formatter per numeric voice: formatValue, when provided, takes over
  // both; otherwise ticks abbreviate and values localise as before.
  const tickText = formatValue ?? formatTick;
  const valueText = formatValue ?? formatValueText;

  // Data can shrink while a point is hovered (a filtered dashboard), so the
  // stored index must never be trusted past the current array (the
  // StackedBarChart guard).
  const hoverPt = hover !== null ? pts[hover] : undefined;
  const hoverDatum = hover !== null ? data[hover] : undefined;

  // Below tablet, every second category label renders; the full set returns
  // at tablet and up. The dropped labels stay fully present in the tooltip
  // (every point keeps its hover target) and in the aria-label above.
  const isNarrow = width > 0 && width < tabletBp;

  useLayoutEffect(() => {
    if (!hoverPt) {
      setTooltipPos(null);
      return;
    }
    const el = tooltipRef.current;
    if (!el) return;
    const bounds = { left: MARGIN.left, top: MARGIN.top, right: MARGIN.left + plotW, bottom: MARGIN.top + plotH };
    setTooltipPos(
      clampTooltipPosition(hoverPt, { width: el.offsetWidth, height: el.offsetHeight }, bounds),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, hoverDatum?.label, hoverDatum?.value, width, height]);

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
          aria-label={`${series ? `Line chart: ${series}` : "Line chart"}. ${data
            .map((d) => `${d.label} ${valueText(d.value)}`)
            .join(", ")}.`}
          // maxWidth caps the pre-measure 640 SSR fallback so it can never
          // overflow a narrower container before ResizeObserver fires (audit).
          style={{ display: "block", maxWidth: "100%" }}
        >
          {/* grid + axis lines */}
          {showGrid
            ? ticks.map((t, i) => (
                <line
                  key={i}
                  x1={MARGIN.left}
                  x2={MARGIN.left + plotW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--chart-grid-line-color)"
                  strokeWidth={1}
                />
              ))
            : null}
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

          {/* y tick labels */}
          {ticks.map((t, i) => (
            <text
              key={i}
              x={MARGIN.left - 8}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="central"
              fill="var(--chart-text-tertiary)"
              style={axisLabelTextStyle}
            >
              {tickText(t)}
            </text>
          ))}

          {/* x category labels: every second one below tablet (A2) */}
          {data.map((d, i) =>
            isNarrow && i % 2 !== 0 ? null : (
              <text
                key={i}
                x={x(i)}
                y={MARGIN.top + plotH + 18}
                textAnchor="middle"
                fill="var(--chart-text-tertiary)"
                style={axisLabelTextStyle}
              >
                {d.label}
              </text>
            ),
          )}

          {/* the line */}
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            data-mw-line-path=""
          />

          {/* points */}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 3}
              fill="var(--background-positive-primary)"
              stroke={color}
              strokeWidth={2}
              style={{ transition: "r var(--motion-transition)", cursor: "pointer" }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>

        {hoverPt && hoverDatum ? (
          <div
            ref={tooltipRef}
            style={{
              ...tooltipStyle,
              left: tooltipPos?.left ?? hoverPt.x,
              top: tooltipPos?.top ?? hoverPt.y,
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

      <style href="magentaweb-line-chart" precedence="default">{lineChartCss}</style>
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

const lineChartCss = `
@keyframes mw-line-draw {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}
[data-mw-line-path] {
  stroke-dasharray: 1;
  animation: mw-line-draw var(--motion-draw-duration) var(--motion-ease) both;
}
`;
