"use client";

import { CSSProperties, Fragment, ReactNode } from "react";
import { ChevronDown, UserAvatar } from "@carbon/icons-react";
import { Avatar, AvatarProps } from "@/components/Avatar";
import { DropdownMenu, DropdownMenuItem } from "@/components/DropdownMenu";

/* ============================================================
   TopBarAccount — the top bar's built-in account control (v4.8.0: the old
   standalone AccountMenu folded INTO TopBar; this file is a PART of TopBar,
   not a public component — consume it through TopBar's `account` prop).

   The person's Avatar + name + chevron form the trigger of a WAI-ARIA menu
   that opens onto an identity header (name + email) and a product-configured
   list of account-level items. The convention stands: the LEFT NAV carries
   product CONTENT; ACCOUNT-level things (profile, settings, the way out)
   belong top-right, grouped, behind the person's identity — never in the
   content nav.

   The trigger renders in the SECONDARY register (DropdownMenu
   triggerVariant="secondary"), so it reads as one of the top bar's outlined
   controls. `avatarVariant` passes through to the Avatar — products whose
   people have no uploaded photo use the "placeholder" gradient face
   (homeowner-style products); products with real photos pass src via their
   own data and the default face.

   Client component: it owns the item handlers. An `href` item is a real link
   (DropdownMenuItem's href branch, a Next <Link role="menuitem">), so the
   browser owns its navigation and every native link affordance survives:
   ctrl / cmd-click and middle-click open a new tab, the URL previews on
   hover, "copy link address" works. Until 26 Aug 2026 the item was a button
   whose onClick ran router.push, and a cmd-click on "Settings" navigated the
   current tab away from whatever was being edited. No router here now.
   Theme is deliberately NOT here: that lives at the rail foot.
   ============================================================ */

// A name that always yields real initials: validation keeps the stored name
// clean, but if it is somehow blank the avatar still gets a sane label rather
// than an empty disc.
const FALLBACK_NAME = "Account";

export interface TopBarAccountItem {
  /** The item label. */
  label: string;
  /** Optional leading icon (a ReactNode, e.g. a Carbon icon). */
  icon?: ReactNode;
  /** Fired on activation. Use this for in-app actions (sign out, open a modal). With
   *  `href` as well, it runs before the link navigates; a modified click (new tab)
   *  passes through to the browser and does not fire it. */
  onSelect?: () => void;
  /** Navigate here on activation. The item renders as a real link (Next <Link>),
   *  so it opens in a new tab on a modified click and shows its URL on hover.
   *  Internal paths ("/settings") route client-side; absolute URLs do a full
   *  navigation. Never prefetched, so a sign-out endpoint is safe here. */
  href?: string;
  /** Danger styling for destructive actions. */
  destructive?: boolean;
}

export interface TopBarAccountProps {
  /** The signed-in person's display name (initials source + menu header). */
  name: string;
  /** The signed-in person's email (menu header, quiet). Omit for none. */
  email?: string;
  /** The account-level items, in order. */
  items: TopBarAccountItem[];
  /** The avatar face shown in the dropdown's identity HEADER: "default" initials,
   *  "brand" accent gradient, or "placeholder" (the selectable gradient face for
   *  products whose people have no uploaded photo). The trigger itself shows a
   *  neutral user glyph (UserAvatar), not an identity disc — the avatar lives in
   *  the open menu's header only (v4.8.0). */
  avatarVariant?: AvatarProps["variant"];
}

export function TopBarAccount({ name, email, items, avatarVariant }: TopBarAccountProps) {
  const displayName = name.trim() || FALLBACK_NAME;

  return (
    <DropdownMenu
      label={`Account: ${displayName}`}
      align="end"
      triggerVariant="secondary"
      triggerIcon={
        <span style={triggerStyle}>
          {/* A neutral user glyph, not an initials/photo disc — the account
              control reads as one of the top bar's icon Buttons. */}
          <UserAvatar size={20} aria-hidden="true" />
          {/* Dual-label markup: the name runs the Button hover slide (the motion
              rules live in DropdownMenu's sheet, keyed off the trigger hover). */}
          <span data-mw-menu-label="">
            <span data-mw-menu-label-primary="">{displayName}</span>
            <span data-mw-menu-label-clone="" aria-hidden="true">{displayName}</span>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </span>
      }
    >
      {/* Identity header: not a menu item (keyboard nav skips it), just the
          glance of who is signed in. The avatar (initials / photo / placeholder)
          lives HERE — the trigger shows the neutral user glyph only. */}
      <div style={headStyle}>
        <Avatar name={displayName} size="md" variant={avatarVariant} />
        <span style={headTextStyle}>
          <span style={headNameStyle}>{displayName}</span>
          {email ? <span style={headEmailStyle}>{email}</span> : null}
        </span>
      </div>
      <div style={sepStyle} aria-hidden="true" />
      {items.map((item, i) => {
        // A divider fences the destructive tail (Sign out) off from the ordinary
        // items — drawn before the first destructive item that follows a
        // non-destructive one.
        const opensDestructiveGroup =
          !!item.destructive && i > 0 && !items[i - 1].destructive;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {opensDestructiveGroup ? <div style={sepStyle} aria-hidden="true" /> : null}
            {/* href passes straight through: the item is then a real link and
                the browser owns the navigation (no router in this file). */}
            <DropdownMenuItem
              icon={item.icon}
              href={item.href}
              destructive={item.destructive}
              onClick={item.onSelect}
            >
              {item.label}
            </DropdownMenuItem>
          </Fragment>
        );
      })}
    </DropdownMenu>
  );
}

/* ---------- inline styles (token-pure) ---------- */

// The trigger: avatar + name + chevron in a row, inside the secondary-register
// DropdownMenu trigger. space-xs between the disc and the name (v4.8.0 — a
// step up from the old 2xs, so the identity breathes inside the outline).
const triggerStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-xs)",
};

const headStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-sm) var(--space-md)",
  minWidth: 0,
};
const headTextStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-3xs)",
  minWidth: 0,
};
const headNameStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-primary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const headEmailStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-2xs)",
  color: "var(--text-positive-tertiary)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
// The header/items divider: a hairline in the faint primary border token.
// 1px is the sanctioned structural minimum (the BrandLockup / HelpModal rule).
const sepStyle: CSSProperties = {
  height: "var(--rule-weight)",
  margin: "var(--space-2xs) 0",
  background: "var(--border-positive-primary)",
};
