"use client";

// The panel's frame: the site's brand row on top (logo left, modes and the signed-in person
// right), a sidebar of pages on desktop, and the same list in a native <dialog> on phones.

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Close, Dashboard, Download, Earth, Launch, Logout, Menu, ShoppingCart, UserAvatar, UserMultiple, Group,
} from "@carbon/icons-react";
import { CdrLockup } from "@/app/(site)/CdrLogo";
import { useRegion } from "@/app/(site)/RegionProvider";
import { useSession } from "../lib/session";

interface NavItem { href: string; label: string; icon: ReactNode; count?: number }

function isActive(pathname: string, href: string): boolean {
  const p = pathname.endsWith("/") ? pathname : pathname + "/";
  return href === "/admin/" ? p === "/admin/" : p.startsWith(href);
}

function NavList({ items, title, pathname, onNavigate }: { items: NavItem[]; title: string; pathname: string; onNavigate?: () => void }) {
  return (
    <div className="adm-nav-group" role="group" aria-label={title}>
      <div className="adm-nav-title" aria-hidden="true">{title}</div>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="adm-nav-link" aria-current={isActive(pathname, it.href) ? "page" : undefined} onClick={onNavigate}>
          {it.icon}
          <span>{it.label}</span>
          {it.count ? <span className="adm-nav-count" aria-label={`${it.count} need attention`}>{it.count}</span> : null}
        </Link>
      ))}
    </div>
  );
}

function Navigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { me } = useSession();
  const shop: NavItem[] = [
    { href: "/admin/", label: "Dashboard", icon: <Dashboard size={20} aria-hidden="true" /> },
    { href: "/admin/orders/", label: "Orders", icon: <ShoppingCart size={20} aria-hidden="true" />, count: me?.attention || undefined },
    { href: "/admin/domains/", label: "Domains", icon: <Earth size={20} aria-hidden="true" /> },
    { href: "/admin/customers/", label: "Customers", icon: <UserMultiple size={20} aria-hidden="true" /> },
  ];
  const you: NavItem[] = [
    { href: "/admin/team/", label: "Team", icon: <Group size={20} aria-hidden="true" /> },
    { href: "/admin/account/", label: "Your account", icon: <UserAvatar size={20} aria-hidden="true" /> },
  ];
  return (
    <>
      <NavList title="Shop" items={shop} pathname={pathname} onNavigate={onNavigate} />
      <NavList title="Access" items={you} pathname={pathname} onNavigate={onNavigate} />
      <div className="adm-side-foot">
        <a className="adm-nav-link" href="/api/admin/export.csv" download>
          <Download size={20} aria-hidden="true" />
          <span>Download CSV</span>
        </a>
        <a className="adm-nav-link" href="/" target="_blank" rel="noreferrer">
          <Launch size={20} aria-hidden="true" />
          <span>Open the shop</span>
        </a>
      </div>
    </>
  );
}

function ModeChip({ label, mode }: { label: string; mode: "test" | "live" }) {
  return (
    <span className="adm-chip adm-mode" title={mode === "live" ? `${label} is live: real money and real domains.` : `${label} is in test mode: nothing real happens.`}>
      <span className="adm-dot" data-tone={mode} aria-hidden="true" />
      {label} <b>{mode === "live" ? "live" : "test"}</b>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/admin/";
  const { me, signOut } = useSession();
  const { code, ready } = useRegion();
  const sheet = useRef<HTMLDialogElement | null>(null);
  const head = useRef<HTMLElement | null>(null);

  // The sidebar sticks under the head, whose height changes with the wrap of its chips.
  useEffect(() => {
    const el = head.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--adm-head-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const close = () => sheet.current?.close();

  return (
    <>
      <header className="adm-head" ref={head}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", minWidth: 0 }}>
          <button type="button" className="adm-chip adm-menu-btn" aria-label="Open the menu" aria-haspopup="dialog" onClick={() => sheet.current?.showModal()}>
            <Menu size={20} aria-hidden="true" />
          </button>
          <Link href="/admin/" className="adm-brand" aria-label="Corporate Domain Registry admin, dashboard">
            <span aria-hidden="true" style={{ display: "inline-flex", visibility: ready ? "visible" : "hidden" }}>
              <CdrLockup region={code} />
            </span>
            <span className="adm-brand-tag" aria-hidden="true">Admin</span>
          </Link>
        </div>
        <div className="adm-utils">
          {me ? (
            <>
              <ModeChip label="Tucows" mode={me.modes.tucows} />
              <ModeChip label="Payments" mode={me.modes.stripe} />
              <Link href="/admin/account/" className="adm-chip" aria-label={`Your account, ${me.user.name}`}>
                <UserAvatar size={16} aria-hidden="true" />
                <span className="adm-who-name">{me.user.name}</span>
              </Link>
              <button type="button" className="adm-chip" onClick={() => void signOut()}>
                <Logout size={16} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <span className="adm-skel" style={{ width: "14rem", height: "var(--control-size-md)" }} aria-hidden="true" />
          )}
        </div>
      </header>

      <div className="adm-frame">
        <nav className="adm-side" aria-label="Admin">
          <div className="adm-side-inner">
            <Navigation pathname={pathname} />
          </div>
        </nav>
        <main id="main" className="adm-main">
          <div className="adm-main-inner">{children}</div>
        </main>
      </div>

      <dialog ref={sheet} className="adm-sheet" aria-label="Menu" onClick={(e) => { if (e.target === sheet.current) close(); }}>
        <div className="adm-sheet-head">
          <span style={{ display: "inline-flex", height: "2.75rem" }} aria-hidden="true">
            <CdrLockup region={code} style={{ height: "100%", width: "auto" }} />
          </span>
          <button type="button" className="adm-chip" aria-label="Close the menu" onClick={close}>
            <Close size={20} aria-hidden="true" />
          </button>
        </div>
        {me ? (
          <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap", padding: "0 var(--space-2xs)" }}>
            <ModeChip label="Tucows" mode={me.modes.tucows} />
            <ModeChip label="Payments" mode={me.modes.stripe} />
          </div>
        ) : null}
        <nav aria-label="Admin" style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", flex: 1 }}>
          <Navigation pathname={pathname} onNavigate={close} />
        </nav>
      </dialog>
    </>
  );
}
