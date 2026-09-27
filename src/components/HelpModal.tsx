"use client";

import { CSSProperties, ReactNode, useState } from "react";
import { Help } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Kbd } from "@/components/Kbd";
import { Tabs, TabsList, TabsTab, TabsPanels, TabsPanel } from "@/components/Tabs";

/* ============================================================
   HelpModal / HelpButton — the top bar's Help control: a labelled icon button
   that opens a tabbed Help modal. The first tab is always the product's
   keyboard shortcuts (rendered from data, so every product declares its own);
   a product passes further tabs (a future in-app help centre, a "getting
   started", release notes) via `tabs`. One shape across every product.

   Composed of mother NATIVE parts (Button, Modal, Tabs, Kbd). Client component:
   it owns the open state. Pair it with NotificationsButton and the product's
   own actions in the TopBar utilities slot.
   ============================================================ */

export interface HelpShortcut {
  /** The keys, in order, each rendered as a <Kbd> (e.g. ["Cmd", "K"] or ["L"]). */
  keys: string[];
  /** What the shortcut does. */
  label: string;
}

export interface HelpShortcutGroup {
  /** Optional group heading (e.g. "Global", "On a piece"). */
  title?: string;
  items: HelpShortcut[];
}

export interface HelpTab {
  label: string;
  content: ReactNode;
}

export interface HelpButtonProps {
  /** The keyboard shortcuts, grouped. Rendered in the first tab. */
  shortcuts: HelpShortcutGroup[];
  /** Tabs beyond "Keyboard shortcuts" (e.g. a help centre, coming later). */
  tabs?: HelpTab[];
  /** The button label. Default "Help". */
  label?: string;
  /** The modal title. Default "Help". */
  title?: string;
}

export function HelpButton({ shortcuts, tabs = [], label = "Help", title = "Help" }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" icon={<Help size={20} />} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={title}>
        <Tabs>
          <TabsList ariaLabel="Help sections">
            <TabsTab>Keyboard shortcuts</TabsTab>
            {tabs.map((t) => (
              <TabsTab key={t.label}>{t.label}</TabsTab>
            ))}
          </TabsList>
          <TabsPanels>
            <TabsPanel>
              <div style={groupsStyle}>
                {shortcuts.map((group, gi) => (
                  <div key={group.title ?? gi} style={groupStyle}>
                    {group.title ? <span style={groupTitleStyle}>{group.title}</span> : null}
                    <ul style={listStyle} role="list">
                      {group.items.map((s) => (
                        <li key={s.label} style={rowStyle}>
                          <span style={rowLabelStyle}>{s.label}</span>
                          <span style={keysStyle}>
                            {s.keys.map((k, ki) => (
                              <Kbd key={ki}>{k}</Kbd>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TabsPanel>
            {tabs.map((t) => (
              <TabsPanel key={t.label}>{t.content}</TabsPanel>
            ))}
          </TabsPanels>
        </Tabs>
      </Modal>
    </>
  );
}

/* ---------- inline styles (token-pure) ---------- */

const groupsStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-lg)" };
const groupStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-2xs)" };
const groupTitleStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  letterSpacing: "var(--label-tracking)",
  textTransform: "uppercase",
  color: "var(--text-positive-tertiary)",
};
const listStyle: CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" };
const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-md)",
  padding: "var(--space-2xs) 0",
  borderBottom: "1px solid var(--border-positive-primary)",
};
const rowLabelStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-primary)",
  minWidth: 0,
};
const keysStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: "var(--space-3xs)", flexShrink: 0 };
