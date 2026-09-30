/* ============================================================
   percentages: the one arithmetic for share-of-a-whole percentages in
   the chart family. DonutChart and ChannelSplitBar both call it, and each
   feeds the SAME integers to its legend, its tooltip or title, and its
   aria-label, so the visible share and the spoken share can never
   disagree (pass 3, 27 Aug 2026: DonutChart's plain Math.round read six
   equal shares as 17 percent six times, 102, in both voices).

   Largest remainder: floor every share, then hand the leftover points to
   the largest fractional parts (ties by input order), so the integers sum
   to exactly 100 where plain rounding lands on 99, 101 or 102.

   Sub-1% rule: a non-zero share that rounds to 0 is still drawn (a donut
   arc, or ChannelSplitBar's 4px sliver), so it must not read "0%". It
   reads "<1%" on screen and "less than 1 percent" in a label. A true zero
   keeps "0%" / "0 percent". An empty or all-zero dataset yields zeros;
   callers that divide for geometry keep their own non-zero guard.
   ============================================================ */

/** Integer percentages of the whole that sum to exactly 100 (largest remainder). */
export function percentages(values: number[]): number[] {
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (v / total) * 100);
  const floors = exact.map(Math.floor);
  let remainder = 100 - floors.reduce((s, v) => s + v, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const out = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    out[order[k].i] += 1;
  }
  return out;
}

/** Visible text for one share: "17%", or "<1%" for a drawn share that rounds to 0. */
export function percentText(percent: number, value: number): string {
  return isDrawnButUnderOne(percent, value) ? "<1%" : `${percent}%`;
}

/** Spoken text for an aria-label: "17 percent", or "less than 1 percent". */
export function percentSpeech(percent: number, value: number): string {
  return isDrawnButUnderOne(percent, value) ? "less than 1 percent" : `${percent} percent`;
}

function isDrawnButUnderOne(percent: number, value: number): boolean {
  return percent === 0 && value > 0;
}
