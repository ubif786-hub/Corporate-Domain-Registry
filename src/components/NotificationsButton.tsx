"use client";

import { CSSProperties, ReactNode, useState } from "react";
import { Notification } from "@carbon/icons-react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";

/* ============================================================
   NotificationsButton — the top bar's notifications control: a labelled icon
   button carrying an optional unread count, opening a panel of the product's
   notifications. The feed itself is the product's to supply (via `children`);
   with none given it shows the mother EmptyState, so the control is useful from
   day one and fills in as a product grows a real feed.

   Composed of mother NATIVE parts (Button, Modal, EmptyState). Client
   component: it owns the open state. Sits in the TopBar utilities slot beside
   HelpButton and the product's own actions.
   ============================================================ */

export interface NotificationsButtonProps {
  /** The label beside the bell. Default "Notifications". */
  label?: string;
  /** Unread count for the badge; omit or 0 for none. */
  count?: number;
  /** The feed. When omitted, a calm empty state stands in. */
  children?: ReactNode;
  /** Empty-state copy when there is no feed yet. */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Button register: "ghost" (default) or "secondary" (v4.8.0) — the
   *  outlined look for bars whose utility cluster reads secondary. */
  variant?: "ghost" | "secondary";
}

export function NotificationsButton({
  label = "Notifications",
  count = 0,
  children,
  emptyTitle = "You're all caught up",
  emptyDescription = "New notifications from the studio will gather here.",
  variant = "ghost",
}: NotificationsButtonProps) {
  const [open, setOpen] = useState(false);
  const unread = count > 0;

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        icon={
          <span style={bellWrapStyle}>
            <Notification size={20} />
            {unread ? <span data-mw-notif-dot="" aria-hidden="true" style={dotStyle} /> : null}
          </span>
        }
        onClick={() => setOpen(true)}
        aria-label={unread ? `${label}, ${count} unread` : label}
      >
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Notifications">
        {children ?? <EmptyState icon={<Notification />} title={emptyTitle} description={emptyDescription} />}
      </Modal>
    </>
  );
}

/* ---------- inline styles (token-pure) ---------- */

const bellWrapStyle: CSSProperties = { position: "relative", display: "inline-flex", lineHeight: 0 };
// The unread dot: the accent disc pinned to the bell's upper-right.
const dotStyle: CSSProperties = {
  position: "absolute",
  top: "-2px",
  right: "-2px",
  width: "0.5rem",
  height: "0.5rem",
  borderRadius: "var(--radius-full)",
  background: "var(--accent-base)",
  border: "1px solid var(--background-positive-primary)",
};
