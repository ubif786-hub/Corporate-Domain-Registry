"use client";

import { ComponentProps, CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Checkmark, Notification } from "@carbon/icons-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DataLabel } from "@/components/DataLabel";
import { EmptyState } from "@/components/EmptyState";
import { Icon } from "@/components/Icon";
import { srOnly, tokenNumber } from "@/components/internal/styles";

// The Carbon-glyph shape Icon accepts (mirrors EmptyState's icon typing), so a
// notification's icon passes into <Icon> without a widening cast.
type IconElement = ComponentProps<typeof Icon>["children"];

/* ============================================================
   NotificationFeed — the product's grouped activity feed. The body a
   product hands to NotificationsButton (rendered as that Modal's children,
   the Companion-drawer read) AND the same component a full "/notifications"
   page renders standalone. One feed, two homes: it carries NO width of its
   own (width:100%, minWidth:0), so it sits comfortably in the narrow drawer
   and stretches across a page main with no variant to pick.

   Anatomy: a quiet header row (an accent count Badge, "3 NEW" or a calm
   "All caught up", on the left and a ghost "Mark all read" Button on the
   right, rendered whenever onMarkAllRead is wired: live while something is
   unread, aria-disabled once nothing is) over date-grouped sections (Today
   / Earlier via the `groups` prop). The control stays MOUNTED at zero unread
   on purpose (v5.10.0, 2.4.3): it used to unmount the instant it was activated,
   taking keyboard focus to <body> with it. aria-disabled rather than the
   native attribute, which would blur the button just the same; Button reads
   the attribute itself (v5.12.0), so the disabled look and the gated hover are
   Button's and nothing is hand-set here. Button's click guard does NOT run on
   this control: it is attached only where a click has an onClick or a submit /
   reset default to cancel, and the handler is dropped at zero unread, so there
   is nothing here to fire and nothing to cancel.
   Each row is a type-inked icon tile beside a title, an optional
   description, and a mono timestamp; unread rows take the faint --accent-wash
   ground and a trailing accent dot, with a screen-reader "Unread." prefix so
   the state is announced, not just seen. A row is a real <Link> when it has
   an href (soft navigation), a <button> when it has onSelect, and an inert
   <div> otherwise. With no items it stands down to the mother EmptyState, so
   the same component covers the first-run.

   Composes mother NATIVE parts (Badge, Button, DataLabel, EmptyState, Icon).
   Client component: it wires onSelect / onMarkAllRead handlers. Timeline was
   considered for the rows but its decorative dot-rail fights the interactive,
   type-tiled, unread-aware row this needs, so the row is bespoke here.
   ============================================================ */

export type NotificationType = "neutral" | "info" | "success" | "warning" | "error";

export interface NotificationItem {
  /** Stable key; falls back to the item's index within its group. */
  id?: string;
  /** A Carbon glyph element (e.g. <ChatBot />). Sized through Icon and inked by
   *  `type`. Decorative — the title carries the meaning. Omit for a type dot. */
  icon?: IconElement;
  /** Colours the icon tile. Default "neutral" (the accent tint). */
  type?: NotificationType;
  /** The headline. Sentence case, concrete. */
  title: ReactNode;
  /** One supporting line; clamped to two lines so rows stay scannable. */
  description?: ReactNode;
  /** Preformatted timestamp ("2m", "Jul 9", "09:41") — never a Date; the feed
   *  formats nothing, so it hydrates cleanly. Renders in the mono meta voice. */
  timestamp: ReactNode;
  /** Marks the row unread: accent-wash ground, trailing dot, SR "Unread." */
  unread?: boolean;
  /** Navigation target. Renders the row as a soft-navigating <Link>. */
  href?: string;
  /** Click handler. Renders the row as a <button>. Ignored when href is set. */
  onSelect?: () => void;
}

export interface NotificationGroup {
  /** The bucket heading, e.g. "Today" / "Earlier". Rendered in the meta voice. */
  title: string;
  items: NotificationItem[];
}

export interface NotificationFeedProps {
  /** The feed, bucketed. An empty array (or all-empty groups) shows EmptyState. */
  groups: NotificationGroup[];
  /** Wires the header's "Mark all read" control; omit to hide it entirely. */
  onMarkAllRead?: () => void;
  /** Empty-state copy when there is nothing to show. */
  emptyTitle?: string;
  emptyDescription?: string;
}

// The icon tile's ground per type — the EmptyState page-tile idiom, re-inked.
// neutral rides the accent tint so a plain notification still reads as alive.
const TILE_GROUND: Record<NotificationType, string> = {
  neutral: "var(--accent-soft)",
  info: "var(--status-info-bg)",
  success: "var(--status-success-bg)",
  warning: "var(--status-warning-bg)",
  error: "var(--status-danger-bg)",
};

// The glyph ink per type — text-grade tones (AA on their own ground). Carbon
// glyphs fill with currentColor, so colouring the tile inks the glyph.
const TILE_INK: Record<NotificationType, string> = {
  neutral: "var(--accent-emphasis)",
  info: "var(--status-info-text)",
  success: "var(--status-success-text)",
  warning: "var(--status-warning-text)",
  error: "var(--status-danger-text)",
};

// Hover + focus + the state grounds live in the sheet, not inline: an inline
// background would out-specify the :hover rule, so the unread wash and the
// hover tint are both attribute-selected here (hover carries the higher
// specificity and wins). The reset neutralises the native <button> chrome so
// the three row elements (Link / button / div) render identically.
const feedCss = `
[data-mw-notif-row] {
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  text-decoration: none;
  border: none;
  background: transparent;
  cursor: default;
  transition: background var(--motion-transition);
}
[data-mw-notif-row][data-interactive="true"] {
  cursor: pointer;
}
[data-mw-notif-row][data-unread="true"] {
  background: var(--accent-wash);
}
[data-mw-notif-row][data-interactive="true"]:hover {
  background: var(--background-positive-secondary);
}
[data-mw-notif-row]:focus-visible {
  outline: var(--focus-outline);
  outline-offset: -2px;
}
`;

function RowInner({ item }: { item: NotificationItem }) {
  const type = item.type ?? "neutral";
  return (
    <>
      <span
        aria-hidden="true"
        style={{ ...tileStyle, background: TILE_GROUND[type], color: TILE_INK[type] }}
      >
        {item.icon ? (
          <Icon size="sm">{item.icon}</Icon>
        ) : (
          <span style={typeDotStyle} />
        )}
      </span>
      <span style={contentStyle}>
        {item.unread ? <span style={srOnly}>Unread. </span> : null}
        <span style={headRowStyle}>
          <span style={titleStyle}>{item.title}</span>
          <span style={metaStyle}>
            <DataLabel>{item.timestamp}</DataLabel>
            {item.unread ? <span aria-hidden="true" style={unreadDotStyle} /> : null}
          </span>
        </span>
        {item.description ? <span style={descriptionStyle}>{item.description}</span> : null}
      </span>
    </>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const shared = {
    "data-mw-notif-row": "",
    "data-unread": item.unread ? "true" : "false",
    style: rowStyle,
  } as const;

  if (item.href) {
    return (
      <Link {...shared} data-interactive="true" href={item.href}>
        <RowInner item={item} />
      </Link>
    );
  }
  if (item.onSelect) {
    return (
      <button {...shared} data-interactive="true" type="button" onClick={item.onSelect}>
        <RowInner item={item} />
      </button>
    );
  }
  return (
    <div {...shared} data-interactive="false">
      <RowInner item={item} />
    </div>
  );
}

export function NotificationFeed({
  groups,
  onMarkAllRead,
  emptyTitle = "You're all caught up",
  emptyDescription = "New notifications from the studio will gather here.",
}: NotificationFeedProps) {
  const nonEmpty = groups.filter((g) => g.items.length > 0);
  const unreadCount = nonEmpty.reduce(
    (n, g) => n + g.items.filter((i) => i.unread).length,
    0,
  );

  if (nonEmpty.length === 0) {
    return (
      <EmptyState
        icon={<Notification />}
        tone="success"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div style={rootStyle}>
      <style href="magentaweb-notification-feed" precedence="default">
        {feedCss}
      </style>

      <div style={feedHeaderStyle}>
        {unreadCount > 0 ? (
          <Badge tone="accent" emphasis="solid">
            {unreadCount} new
          </Badge>
        ) : (
          <span style={caughtUpStyle}>All caught up</span>
        )}
        {onMarkAllRead ? (
          // Stays mounted at zero unread (see the header note). aria-disabled
          // keeps the tab stop and the focus ring while the handler stands
          // down; the native attribute would blur it. Button reads the
          // attribute: its sheet paints the :disabled look and its
          // data-disabled gates the hover fill and the label motion, so the
          // hand-set data-disabled and the inline ink and cursor this used to
          // carry are gone. Dropping the handler stays THIS component's job:
          // with no onClick and the default type="button", there is no click
          // for Button to cancel, so it attaches no guard here (measured: the
          // click on the stood-down control is not defaultPrevented) and the
          // control carries no function prop at all.
          <Button
            variant="ghost"
            size="sm"
            icon={<Checkmark size={16} />}
            aria-disabled={unreadCount === 0 ? true : undefined}
            onClick={unreadCount > 0 ? onMarkAllRead : undefined}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      <div style={groupsWrapStyle}>
        {nonEmpty.map((group, gi) => (
          <section key={group.title || gi} aria-label={group.title} style={groupStyle}>
            <DataLabel as="p" style={groupHeadingStyle}>
              {group.title}
            </DataLabel>
            <ul role="list" style={listStyle}>
              {group.items.map((item, i) => (
                <li key={item.id ?? i} style={itemStyle}>
                  <NotificationRow item={item} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ---------- inline styles (token-pure) ---------- */

const rootStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-lg)",
  width: "100%",
  minWidth: 0,
};

// The header row: count/status on the left, the clear action pinned right. It
// wraps so a narrow drawer stacks the pair rather than crushing them.
const feedHeaderStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
};

const caughtUpStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-secondary)",
};

// S-11, sanctioned at D35 (27 Aug 2026). This lg sits INSIDE the root's lg
// (rootStyle above), so the header-to-groups gap and the group-to-group gap
// resolve to the same rung, which the spacing ladder normally forbids: deeper is
// meant to be tighter. It stays because the two gaps separate peers of the SAME
// weight, not a parent from its child. The root's lg divides the feed's three
// bands (header, groups, footer) and this one divides the day groups, and a day
// group is a band of the feed in every way that matters to the eye: it carries
// its own dated heading and its own list. Tightening it to md would bind the
// last row of Tuesday to Wednesday's date heading more closely than Wednesday's
// heading binds to its own rows (--space-2xs, groupStyle below), which is the
// ladder violation that would actually show. Nothing renders wrong today.
const groupsWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-lg)",
};

const groupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
};

const groupHeadingStyle: CSSProperties = {
  paddingInline: "var(--space-xs)",
};

const listStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
};

const itemStyle: CSSProperties = {
  minWidth: 0,
};

// The row shell: the icon tile column beside the content column. Background and
// interactive states are sheet-owned (see feedCss); layout is inline.
const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  columnGap: "var(--space-sm)",
  alignItems: "start",
  padding: "var(--space-sm)",
  borderRadius: "var(--component-radius)",
};

// The type tile: the EmptyState Card.Icon idiom at row scale. 2rem is
// structural tile geometry (sized to the sm/16 glyph plus its breathing room),
// a sanctioned rem minimum.
const tileStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "2rem",
  height: "2rem",
  borderRadius: "var(--component-radius)",
  flexShrink: 0,
};

// The typeless fallback glyph: a type-inked disc (currentColor from the tile).
// 0.375rem is the Timeline group-dot geometry, a sanctioned structural minimum.
const typeDotStyle: CSSProperties = {
  width: "0.375rem",
  height: "0.375rem",
  borderRadius: "var(--radius-full)",
  background: "currentColor",
};

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  minWidth: 0,
};

const headRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "var(--space-sm)",
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  fontWeight: tokenNumber("var(--weight-medium)"),
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-primary)",
  minWidth: 0,
};

const metaStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-2xs)",
  flexShrink: 0,
};

// The unread marker: the accent disc, the NotificationsButton bell-dot at row
// scale. 0.5rem is the shared unread-dot geometry, a sanctioned rem minimum.
const unreadDotStyle: CSSProperties = {
  width: "0.5rem",
  height: "0.5rem",
  borderRadius: "var(--radius-full)",
  background: "var(--accent-base)",
  flexShrink: 0,
};

// Two-line clamp keeps rows scannable; the full text lives behind the row's
// href/onSelect. Font-relative throughout, no layout literal.
const descriptionStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-xs)",
  lineHeight: "var(--leading-snug)",
  color: "var(--text-positive-secondary)",
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden",
};
