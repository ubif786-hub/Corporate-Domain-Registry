"use client";

import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { chartHoverPaint, tokenNumber } from "@/components/internal/styles";
import { LegendDot } from "@/components/LegendDot";
import { clampTooltipPosition, readTabletBreakpoint } from "@/components/charts/chartInteraction";

/* ============================================================
   StackedBarChart — N-column stacked bars (Sprint 3B, the ArtistHQ
   sales revenue chart). A SIBLING of BarChart, not an extension:
   BarChart's contract is one series of { label, value } with per-bar
   geometry, tooltip, and legend; stacking changes the data shape, the
   tooltip unit (a segment, not a bar), the legend (a keyed series
   list), and adds the projection treatment. Grafting all of that onto
   BarChart's single-series props would have left both harder to read,
   so the axis / label / tooltip / animation conventions are carried
   over verbatim instead (same margins, same tick math, same
   ResizeObserver pixel-space rendering, same --chart-* tokens).

   Segment colors arrive as DATA (--category-* / --chart-* token
   expressions or product hexes, the SwatchRow / chart-series
   exception); the chart's own dress stays token-pure.

   projectionColumn renders those columns as PROJECTION STUBS: each
   segment keeps its series color but drops to a dashed stroke over a
   15% fill of the same color, so the column reads as an outline of
   what is expected rather than a fact. One index stubs a single
   period; an index array stubs a trailing multi-period forecast. The
   accessible label appends "(projected)" to every stubbed column.

   Deferred: negative-value stacks, per-segment value annotations,
   100%-normalized mode.
   ============================================================ */

export interface StackedBarSegment {
  /** Series key, matched against legend entries for the tooltip name. */
  key: string;
  value: number;
  /** Color token expression or hex, e.g. "var(--category-1)". */
  color: string;
}

export interface StackedBarColumn {
  label: string;
  values: StackedBarSegment[];
}

export interface StackedBarLegendEntry {
  key: string;
  label: string;
  color: string;
}

export interface StackedBarChartProps {
  columns: StackedBarColumn[];
  /** Series legend, rendered above the plot as square LegendDots. */
  legend?: StackedBarLegendEntry[];
  /**
   * Column index (or indices) rendered as the dashed projection stub. A
   * trailing multi-period forecast passes the tail indices.
   */
  projectionColumn?: number | number[];
  height?: number;
  showGrid?: boolean;
  /**
   * Formats every numeric surface (axis ticks, tooltip value, accessible-label
   * values), e.g. a currency formatter for a money axis. Absent, ticks keep
   * the built-in k-abbreviation and values keep toLocaleString.
   */
  formatValue?: (value: number) => string;
}

const MARGIN = { top: 16, right: 16, bottom: 32, left: 48 };
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

export function StackedBarChart({
  columns,
  legend,
  projectionColumn,
  height = 300,
  showGrid = true,
  formatValue,
}: StackedBarChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<{ col: number; seg: number } | null>(null);
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

  const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotH = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const totals = columns.map((c) => c.values.reduce((s, v) => s + v.value, 0));
  const maxV = Math.max(...totals, 0);
  const valueTicks = Array.from({ length: TICKS + 1 }, (_, i) => (maxV * i) / TICKS);

  // One formatter per numeric voice: formatValue, when provided, takes over
  // both; otherwise ticks abbreviate and values localise as before.
  const tickText = formatValue ?? formatTick;
  const valueText = formatValue ?? formatValueText;

  // Normalise projectionColumn (one index or an index array) to a Set so
  // every projection-treatment site asks the same question.
  const projectedColumns = new Set(
    projectionColumn === undefined
      ? []
      : Array.isArray(projectionColumn)
        ? projectionColumn
        : [projectionColumn],
  );

  const valuePos = (v: number) =>
    MARGIN.top + plotH - (maxV === 0 ? 0 : (v / maxV) * plotH);

  // Geometry: one band per column, segments stacked bottom-up in values order.
  const n = columns.length || 1;
  const band = plotW / n;
  const barW = band * 0.6;
  const stacks = columns.map((c, i) => {
    const x = MARGIN.left + band * i + (band - barW) / 2;
    let running = 0;
    const segs = c.values.map((v) => {
      const y0 = running;
      running += v.value;
      const yTop = valuePos(running);
      const yBottom = valuePos(y0);
      return { x, y: yTop, w: barW, h: Math.max(0, yBottom - yTop), seg: v };
    });
    return { x, segs };
  });

  const seriesLabel = (key: string) =>
    legend?.find((l) => l.key === key)?.label ?? key;

  const hoverRect =
    hover !== null ? stacks[hover.col]?.segs[hover.seg] : undefined;

  // Below tablet, every second category label renders; the full set returns
  // at tablet and up. Dropped labels stay fully present in the tooltip
  // (every segment keeps its hover target) and the aria-label above.
  const isNarrow = width > 0 && width < tabletBp;

  useLayoutEffect(() => {
    if (!hoverRect) {
      setTooltipPos(null);
      return;
    }
    const el = tooltipRef.current;
    if (!el) return;
    const anchor = { x: hoverRect.x + hoverRect.w / 2, y: hoverRect.y };
    const bounds = { left: MARGIN.left, top: MARGIN.top, right: MARGIN.left + plotW, bottom: MARGIN.top + plotH };
    setTooltipPos(clampTooltipPosition(anchor, { width: el.offsetWidth, height: el.offsetHeight }, bounds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover?.col, hover?.seg, width, height]);

  return (
    <div ref={ref} style={wrapStyle}>
      {legend && legend.length > 0 ? (
        <div style={legendRowStyle}>
          {legend.map((l) => (
            <LegendDot key={l.key} shape="square" color={l.color}>
              {l.label}
            </LegendDot>
          ))}
        </div>
      ) : null}

      <div style={{ position: "relative" }}>
        <svg
          width={width}
          height={height}
          role="img"
          // The label carries the data itself (same contract as BarChart /
          // DonutChart): the tooltip is hover-only, so this is the whole
          // SR/keyboard story.
          aria-label={`Stacked bar chart. ${columns
            .map(
              (c, i) =>
                `${c.label}${projectedColumns.has(i) ? " (projected)" : ""}: ${c.values
                  .map((v) => `${seriesLabel(v.key)} ${valueText(v.value)}`)
                  .join(", ")}`,
            )
            .join(". ")}.`}
          // maxWidth caps the pre-measure 640 SSR fallback so it can never
          // overflow a narrower container before ResizeObserver fires (audit).
          style={{ display: "block", maxWidth: "100%" }}
        >
          {/* value-axis grid lines */}
          {showGrid
            ? valueTicks.map((t, i) => (
                <line
                  key={i}
                  x1={MARGIN.left}
                  x2={MARGIN.left + plotW}
                  y1={valuePos(t)}
                  y2={valuePos(t)}
                  stroke="var(--chart-grid-line-color)"
                  strokeWidth={1}
                />
              ))
            : null}

          {/* baseline + category axis */}
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
          {valueTicks.map((t, i) => (
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
          ))}

          {/* category labels; the projection column speaks the display italic
              so "not yet fact" reads at the axis too. Every second one below
              tablet (A2). */}
          {columns.map((c, i) =>
            isNarrow && i % 2 !== 0 ? null : (
              <text
                key={i}
                x={stacks[i].x + barW / 2}
                y={MARGIN.top + plotH + 18}
                textAnchor="middle"
                fill="var(--chart-text-tertiary)"
                style={
                  projectedColumns.has(i)
                    ? { ...axisLabelTextStyle, fontStyle: "italic" }
                    : axisLabelTextStyle
                }
              >
                {c.label}
              </text>
            ),
          )}

          {/* stacks: each column is one <g> growing from the baseline,
              staggered by column index (the BarChart grow convention) */}
          {stacks.map((stack, ci) => {
            const projected = projectedColumns.has(ci);
            return (
              <g
                key={ci}
                data-mw-stack=""
                style={{ animationDelay: `calc(var(--motion-stagger) * ${ci})` }}
              >
                {stack.segs.map((s, si) =>
                  s.h <= 0 ? null : (
                    <rect
                      key={si}
                      x={s.x}
                      y={s.y}
                      width={s.w}
                      height={s.h}
                      fill={
                        hover?.col === ci && hover?.seg === si
                          ? chartHoverPaint(s.seg.color)
                          : s.seg.color
                      }
                      // The projection stub: dashed stroke in the series
                      // color over a 15% fill of the same color. Opacity is
                      // structural (a ratio, not a color); the color itself
                      // still arrives as data.
                      fillOpacity={projected ? 0.15 : 1}
                      stroke={projected ? s.seg.color : "none"}
                      strokeWidth={projected ? 1.5 : 0}
                      strokeDasharray={projected ? "4 3" : undefined}
                      style={{
                        transition: "fill var(--motion-transition)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={() => setHover({ col: ci, seg: si })}
                      onMouseLeave={() => setHover(null)}
                    />
                  ),
                )}
              </g>
            );
          })}
        </svg>

        {hover !== null && hoverRect ? (
          <div
            ref={tooltipRef}
            style={{
              ...tooltipStyle,
              left: tooltipPos?.left ?? hoverRect.x + hoverRect.w / 2,
              top: tooltipPos?.top ?? hoverRect.y,
            }}
            // Pointer-only and unreachable by keyboard, so hidden from AT rather
            // than announced: role="status" on a node created in the same frame
            // as its text is unreliable in both directions (silence on some
            // readers, a burst of fragments on others), and the svg label
            // already speaks every value.
            aria-hidden="true"
          >
            <span style={tooltipLabelStyle}>
              {columns[hover.col].label}
              {projectedColumns.has(hover.col) ? " · projected" : ""}
              {" · "}
              {seriesLabel(hoverRect.seg.key)}
            </span>
            <span style={tooltipValueStyle}>
              {valueText(hoverRect.seg.value)}
            </span>
          </div>
        ) : null}
      </div>

      <style href="magentaweb-stacked-bar-chart" precedence="default">{stackedBarCss}</style>
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

const legendRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-xs) var(--space-md)", // row xs, column md (v5.5.0): see ChannelSplitBar
  marginBottom: "var(--space-sm)",
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

const stackedBarCss = `
@keyframes mw-stack-grow {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
[data-mw-stack] {
  transform-box: fill-box;
  transform-origin: bottom;
  animation: mw-stack-grow var(--motion-draw-duration) var(--motion-ease) both;
}
`;
