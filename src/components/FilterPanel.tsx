"use client";

import { useId, useState } from "react";
import { RadioGroup } from "@/components/Radio";
import { FormGroup } from "@/components/FormGroup";
import { ChoiceCard } from "@/components/ChoiceCard";

/* ============================================================
   FilterPanel (v1 primitive) — a vertical panel of titled groups of ChoiceCards.
   Each group is a fieldset with a legend title and a stack of ChoiceCards, one per
   row. Per-group mode lets one panel mix a single-select group and multi-select
   groups: a "single" group renders inside a RadioGroup (an instance-scoped native
   name owns the single-select), a "multi" group renders inside a FormGroup of
   independent ChoiceCard checkboxes.

   FilterPanel owns the selection and reports it up through onChange as ONE combined
   shape keyed by group id: { [groupId]: string (single) | string[] (multi) }. The
   consumer owns what "apply" means (this primitive only reflects selection).

   v1 scope: the titled groups + selection only. No drawer/popover shell, no
   apply/clear actions, no collapsible groups, no result counts, no responsive
   collapse. Those are logged in REFACTOR_QUEUE for the real build. Composes
   ChoiceCard; it never duplicates the card markup. Client (it owns state).

   Mounting the same groups twice (the sidebar-plus-drawer pair that "no
   responsive collapse" pushes a consumer into) is SAFE, ids included, as of
   D33 (27 Aug 2026). Every card id is minted per instance by RadioGroup and
   ChoiceCard (26 Aug 2026), so labels and descriptions always target their own
   controls; and the native radio NAME is now minted per instance too.

   Why the name had to move. A radio input's name is what makes a native radio
   group, and it is GLOBAL TO THE DOCUMENT. Writing the caller's group id
   straight onto the radios made two panels sharing a group id ONE browser
   group: the parser dropped the first panel's default on load (measured: the
   sidebar's single group read "" while the drawer read "coastal"), and every
   pick in the first panel was then reverted, because react-dom restores a
   changed radio's "named cousins" to their own props and rechecking the
   drawer's input unchecks the sidebar's. The panel's state and the DOM
   disagreed on four radios, and the sidebar could not hold a selection at all.
   The consumer never asked for a native group; it asked for a selection key.

   So: the group id stays exactly the CALLER'S key. It is the onChange key, it
   is stamped on the group wrapper as data-mw-filterpanel-group, and it is
   still the readable half of the radio name. The name is prefixed with a
   per-instance useId, which makes it instance-scoped without changing anything
   the caller sees. Already a client component (it owns useState), so no
   boundary question arises; useId would work in a server component too
   (react 19.2.4, CONTEXT.md).

   ONE THING IS STILL NOT PER INSTANCE, and it is the last document-global
   thing a paired mount can collide on: ariaLabel. Every card id, every
   describedby target and now the radio name are minted per mount, but the
   panel's accessible name is whatever the caller passes, and it DEFAULTS to
   "Filters". Two panels mounted from one groups array and given no ariaLabel
   are two region landmarks with the same name, which is a screen reader's
   landmark list with two indistinguishable entries. Measured 27 Aug 2026 in
   the Chromium AX tree: the pair at the default reports region "Filters",
   region "Filters". The default is right for the single panel that is the
   common case, so it stays; give EACH mount of a pair its own ariaLabel
   ("Sidebar filters" / "Drawer filters", as the docs example does).

   FilterPanel is NOT a form control and its radio name is not a submission
   field name. It never was usable as one: the "multi" half emits no native
   name at all (ChoiceCard has ignored the prop since 27 Aug 2026), so a panel
   inside a form has always submitted its single groups and nothing else. A
   real submission API is v2. scripts/probe-radio-scope.mjs measures all of it.
   ============================================================ */

export interface FilterPanelOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface FilterPanelGroup {
  /** Stable key. THE CALLER'S key: it keys the onChange selection, it is stamped on the group
   *  wrapper as data-mw-filterpanel-group, and it seeds the readable half of a single group's
   *  radio name. It is NOT the native radio group on its own (see the header): the name carries
   *  a per-instance prefix, so two panels may share ids freely. */
  id: string;
  title: string;
  mode: "single" | "multi";
  options: FilterPanelOption[];
  /** single: the pre-selected value; multi: the pre-selected values. */
  defaultValue?: string | string[];
}

export type FilterSelection = Record<string, string | string[]>;

export interface FilterPanelProps {
  groups: FilterPanelGroup[];
  /** Fires with the full selection (keyed by group id) on every change. */
  onChange?: (selection: FilterSelection) => void;
  /** Accessible name for the panel region. The ONE value that is not minted per instance
   *  (see the header): mounting the pair without giving each its own leaves two region
   *  landmarks both named "Filters". */
  ariaLabel?: string;
}

function initSelection(groups: FilterPanelGroup[]): FilterSelection {
  const sel: FilterSelection = {};
  for (const g of groups) {
    if (g.mode === "single") sel[g.id] = typeof g.defaultValue === "string" ? g.defaultValue : "";
    else sel[g.id] = Array.isArray(g.defaultValue) ? g.defaultValue : [];
  }
  return sel;
}

export function FilterPanel({ groups, onChange, ariaLabel = "Filters" }: FilterPanelProps) {
  const [selection, setSelection] = useState<FilterSelection>(() => initSelection(groups));
  // The native radio group, scoped to THIS mount. Stable across server and client, so the
  // hydrated name matches the streamed one. See the header for what sharing it cost.
  const instanceId = useId();

  const commit = (next: FilterSelection) => {
    setSelection(next);
    onChange?.(next);
  };

  const setSingle = (groupId: string, value: string) => {
    commit({ ...selection, [groupId]: value });
  };

  const toggleMulti = (groupId: string, value: string, checked: boolean) => {
    const current = selection[groupId];
    const arr = Array.isArray(current) ? current : [];
    commit({ ...selection, [groupId]: checked ? [...arr, value] : arr.filter((v) => v !== value) });
  };

  return (
    <section data-mw-filterpanel="" aria-label={ariaLabel}>
      <style href="magentaweb-filterpanel" precedence="default">{css}</style>
      {groups.map((g) => (
        <div key={g.id} data-mw-filterpanel-group={g.id}>
          {g.mode === "single" ? (
            <RadioGroup
              name={`${instanceId}-${g.id}`}
              label={g.title}
              legendVariant="group"
              value={typeof selection[g.id] === "string" ? (selection[g.id] as string) : ""}
              onChange={(v) => setSingle(g.id, v)}
            >
              {g.options.map((o) => (
                <ChoiceCard
                  key={o.value}
                  mode="single"
                  value={o.value}
                  label={o.label}
                  description={o.description}
                  disabled={o.disabled}
                />
              ))}
            </RadioGroup>
          ) : (
            <FormGroup legend={g.title}>
              {g.options.map((o) => (
                <ChoiceCard
                  key={o.value}
                  mode="multi"
                  // NOT instance-scoped, deliberately, and it is not the radio bug in another
                  // costume. ChoiceCard does not read this prop (its own comment says so), so it
                  // reaches no DOM node: measured 0 checkboxes carrying a native name. And if it
                  // is ever wired through, a checkbox name is a SUBMISSION field, not a grouping
                  // mechanism, so the caller's key is the right value there: several boxes under
                  // one name is how a multi-select submits. Only radios are grouped by name, and
                  // only radios need the prefix.
                  name={g.id}
                  value={o.value}
                  label={o.label}
                  description={o.description}
                  checked={Array.isArray(selection[g.id]) ? (selection[g.id] as string[]).includes(o.value) : false}
                  onChange={(checked) => toggleMulti(g.id, o.value, checked)}
                  disabled={o.disabled}
                />
              ))}
            </FormGroup>
          )}
        </div>
      ))}
    </section>
  );
}

const css = `
[data-mw-filterpanel] {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}
[data-mw-filterpanel-group] {
  display: flex;
  flex-direction: column;
}
`;
