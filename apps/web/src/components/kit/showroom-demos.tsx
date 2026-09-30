"use client";

import { CSSProperties, MouseEvent, useState } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { DropdownMenu, DropdownMenuItem } from "@/components/DropdownMenu";
import { Toast, type ToastTone } from "@/components/Toast";
import { useToast } from "@/components/ToastProvider";
import { AppShell } from "@/components/AppShell";
import { TopBar } from "@/components/TopBar";
import { NavRail } from "@/components/NavRail";
import { PhotoStrip } from "@/components/PhotoStrip";
import { CommandPalette } from "@/components/CommandPalette";
import { LineItemRow } from "@/components/LineItemRow";
import { Search } from "@/components/Search";
import { Pagination } from "@/components/Pagination";
import { TabLinks } from "@/components/TabLinks";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatMessage } from "@/components/ChatMessage";
import { BrandLockup } from "@/components/BrandLockup";
import { HeroPlate } from "@/components/HeroPlate";
import { Heading } from "@/components/Heading";
import { BrandWordmark } from "@/components/BrandWordmark";
import { BrandMark } from "@/components/BrandMark";
import { HelpButton } from "@/components/HelpModal";
import { NotificationsButton } from "@/components/NotificationsButton";
import { FormModal } from "@/components/FormModal";
import { FileUpload } from "@/components/FileUpload";
import { BulkActionBar } from "@/components/BulkActionBar";
import { TextField } from "@/components/TextField";
import { View, Edit, Copy, TrashCan, Home, Folders, Settings, Add, Document, Currency } from "@carbon/icons-react";

// The showroom demos that genuinely need client state or handlers: a dialog you
// open, a menu whose items fire, and toasts you dismiss or raise. Everything else
// in the showroom renders straight from the server component. ToastProvider is
// mounted once in the root layout, so useToast works here. Part of the kit
// (sync unit): one copy, promoted from the per-fork Interactive files, on the
// CURRENT APIs (Toast's tone, not the retired variant).

export function ShowroomPhotoStripDemo() {
  // Live selection: click a thumb and the 2px accent ring moves. The add slot
  // stays dashed (a real consumer opens a picker; here it is a quiet no-op).
  const [selected, setSelected] = useState(0);
  return (
    <div style={{ maxWidth: "32rem", width: "100%" }}>
      <PhotoStrip
        ariaLabel="Piece photos"
        selectedIndex={selected}
        onSelect={setSelected}
        onAdd={() => {}}
        photos={[
          { src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-architecture-c6ced177.webp", alt: "Concrete facade in daylight", date: "Jul 2" },
          { src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-landscape-eb9ea504.webp", alt: "City rooftops at dusk", date: "Jul 5" },
          { src: "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-interior-732f8097.webp", alt: "Forest path with morning light", date: "Jul 8" },
        ]}
      />
    </div>
  );
}

export function ShowroomModalDemo() {
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
      <Button variant="primary" onClick={() => setOpen(true)}>Open dialog</Button>
      <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
      <Modal
        variant="drawer"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Companion"
        description="A side conversation the page stays alive for."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Dismiss</Button>
            <Button variant="ink" onClick={() => setDrawerOpen(false)}>Log it</Button>
          </>
        }
      >
        <p style={{ margin: 0, color: "var(--text-positive-secondary)", lineHeight: "var(--leading-normal)" }}>
          The drawer slides in from the right at 480px, behind the lighter drawer
          scrim. Same focus trap and background inert as the modal; the page behind it
          still scrolls, and Escape or a scrim click dismisses it. Escape and a scrim click dismiss it.
        </p>
      </Modal>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Start a new project"
        description="Set up a workspace and pick a starting template."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>Create project</Button>
          </>
        }
      >
        <p style={{ margin: 0, color: "var(--text-positive-secondary)", lineHeight: "var(--leading-normal)" }}>
          This dialog portals to the document body, locks page scroll, and marks the page behind it
          inert while it is open.
        </p>
      </Modal>
    </div>
  );
}

export function ShowroomMenuDemo() {
  const [last, setLast] = useState("");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
      <DropdownMenu label="Row actions">
        <DropdownMenuItem icon={<View size={16} />} onClick={() => setLast("View")}>View</DropdownMenuItem>
        <DropdownMenuItem icon={<Edit size={16} />} onClick={() => setLast("Edit")}>Edit</DropdownMenuItem>
        <DropdownMenuItem icon={<Copy size={16} />} disabled onClick={() => setLast("Duplicate")}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem icon={<TrashCan size={16} />} destructive onClick={() => setLast("Delete")}>Delete</DropdownMenuItem>
      </DropdownMenu>
      <span style={hintStyle}>{last ? `Chose: ${last}` : "Open the menu and pick an item."}</span>
    </div>
  );
}

const TOASTS: { id: string; tone: ToastTone; title: string; description: string }[] = [
  { id: "sr-info", tone: "info", title: "Heads up", description: "Your export is queued and will start shortly." },
  { id: "sr-success", tone: "success", title: "Project saved", description: "All changes synced to the cloud." },
  { id: "sr-warning", tone: "warning", title: "Storage almost full", description: "You have used 92 percent of your plan." },
  { id: "sr-error", tone: "error", title: "Upload failed", description: "The connection dropped. Try again." },
];

export function ShowroomToastDemo() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { toast } = useToast();
  const visible = TOASTS.filter((t) => !dismissed.includes(t.id));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)", alignItems: "center" }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => toast({ tone: "success", title: "Project saved", description: "All changes synced to the cloud." })}
        >
          Raise a live toast
        </Button>
        {dismissed.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setDismissed([])}>Reset cards</Button>
        ) : null}
        <span style={hintStyle}>The live toast rises into the bottom-right viewport.</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", maxWidth: "24rem" }}>
        {visible.map((t) => (
          <Toast
            key={t.id}
            id={t.id}
            tone={t.tone}
            title={t.title}
            description={t.description}
            duration={0}
            onDismiss={(id) => setDismissed((d) => [...d, id])}
          />
        ))}
      </div>
    </div>
  );
}

// The CommandPalette demo: an "Open palette" trigger (the drawer-demo idiom;
// a palette is invisible until summoned) plus a visible last-action line so a
// selection is observable (the CDP interaction asserts read it). The consumer
// owns the ⌘K binding; here the button stands in for it.
export function ShowroomCommandPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState("");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
      <Button variant="secondary" onClick={() => setOpen(true)}>Open palette</Button>
      <span style={hintStyle} data-sr-palette-last="">
        {last ? `Ran: ${last}` : "Type to filter; arrows move, Enter runs, Escape closes."}
      </span>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        fallbackAction={{ label: "Log a new sitting", onSelect: () => setLast("Log a new sitting") }}
        resultGroups={[
          {
            title: "Go to",
            items: [
              { icon: <Home size={16} />, title: "Home", meta: "Overview", onSelect: () => setLast("Home"), shortcut: "G H" },
              { icon: <Folders size={16} />, title: "Works", meta: "All pieces", onSelect: () => setLast("Works"), shortcut: "G W" },
              { icon: <Document size={16} />, title: "Low Tide, no. 3", meta: "Harbor · WIP", onSelect: () => setLast("Low Tide, no. 3") },
            ],
          },
          {
            title: "Actions",
            items: [
              { icon: <Add size={16} />, title: "Log a sitting", meta: "Session log", onSelect: () => setLast("Log a sitting"), shortcut: "L" },
              { icon: <Currency size={16} />, title: "Record a sale", meta: "Sales", onSelect: () => setLast("Record a sale") },
              { icon: <Settings size={16} />, title: "Open settings", onSelect: () => setLast("Open settings") },
            ],
          },
        ]}
      />
    </div>
  );
}

// The LineItemRow demo: a read-only row beside a live editable pair whose qty
// fields recompute the amount (controlled, the parent owning the numbers, so
// the recompute is observable end to end). Remove drops a row; reset restores.
const DEMO_ITEMS: { id: string; description: string; qty: number; rate: number }[] = [
  { id: "li-1", description: "Low Tide, no. 3 · oil on panel", qty: 1, rate: 640 },
  { id: "li-2", description: "Float frame, natural oak", qty: 2, rate: 85 },
];

export function ShowroomLineItemRowDemo() {
  const [items, setItems] = useState(DEMO_ITEMS.map((item) => ({ ...item })));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", width: "100%", maxWidth: "36rem" }}>
      <div>
        {items.map((item, i) => (
          <LineItemRow
            key={item.id}
            editable
            description={item.description}
            qty={item.qty}
            rate={item.rate}
            onQtyChange={(qty) => setItems((rows) => rows.map((r, j) => (j === i ? { ...r, qty } : r)))}
            onRemove={() => setItems((rows) => rows.filter((_, j) => j !== i))}
          />
        ))}
        <LineItemRow description="Shipping · insured courier" qty={1} rate={48} />
      </div>
      {items.length < DEMO_ITEMS.length ? (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setItems(DEMO_ITEMS.map((item) => ({ ...item })))}>
            Reset rows
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// The Search demo: a controlled field live-filtering a short client roster, so
// the leading glyph, the clear affordance, and the filter are all observable
// end to end. The empty note keeps a no-match query from reading as a dead end.
const SEARCH_CLIENTS = [
  "Ada Osei",
  "Bruno Keller",
  "Chiara Fontana",
  "Daan Visser",
  "Emeka Obi",
  "Freja Lindqvist",
];

export function ShowroomSearchDemo() {
  const [query, setQuery] = useState("");
  const matches = SEARCH_CLIENTS.filter((n) =>
    n.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", maxWidth: "24rem", width: "100%" }}>
      <Search
        id="sr-search-clients"
        label="Find a client"
        placeholder="Search clients"
        value={query}
        onChange={setQuery}
        helper="Filters the roster as you type."
      />
      {matches.length > 0 ? (
        <ul style={searchResultListStyle} role="list">
          {matches.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : (
        <p style={{ ...hintStyle, margin: 0 }}>{`No clients match "${query.trim()}".`}</p>
      )}
    </div>
  );
}

// The Pagination demo: the canonical consumer wiring in miniature. The page is
// client state, the roster slice derives from it, and the control only reports
// intent. Sixteen people at two per page make eight pages, so the ellipsis
// collapse is visible live.
const PAGED_PEOPLE = [
  "Ada Osei",
  "Bruno Keller",
  "Chiara Fontana",
  "Daan Visser",
  "Emeka Obi",
  "Freja Lindqvist",
  "Goran Ilic",
  "Hana Sato",
  "Ines Duarte",
  "Jonas Weber",
  "Kaia Nygaard",
  "Liam Byrne",
  "Mireia Soler",
  "Noor Haddad",
  "Otto Lindgren",
  "Priya Nair",
];
const PAGE_SIZE = 2;

export function ShowroomPaginationDemo() {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(PAGED_PEOPLE.length / PAGE_SIZE);
  const rows = PAGED_PEOPLE.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", maxWidth: "24rem", width: "100%" }}>
      <ul style={searchResultListStyle} role="list">
        {rows.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} ariaLabel="People pages" />
      <span style={hintStyle}>{`Page ${page} of ${pageCount} · ${PAGED_PEOPLE.length} people, ${PAGE_SIZE} per page.`}</span>
    </div>
  );
}

// The TabLinks demo: the component is a dumb server nav (the consumer computes
// active from its route match), so a static render reads as broken. Here the
// active index is client state standing in for that match: the wrapper
// intercepts clicks on the rendered anchors (capture phase, preventDefault, so
// next/link never runs and the URL stays put), resolves the clicked link's
// index by href, and re-renders with that item active.
const TABLINK_ITEMS = [
  { label: "Inventory", href: "#tl-inventory" },
  { label: "Projects", href: "#tl-projects" },
  { label: "Doc vault", href: "#tl-doc-vault" },
];

export function ShowroomTabLinksDemo() {
  const [active, setActive] = useState(1);
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("[data-mw-tablinks-link]");
    if (!anchor) return;
    e.preventDefault();
    const index = TABLINK_ITEMS.findIndex((item) => item.href === anchor.getAttribute("href"));
    if (index !== -1) setActive(index);
  };
  return (
    <div style={{ width: "100%", maxWidth: "36rem" }} onClickCapture={onClickCapture}>
      <TabLinks
        ariaLabel="Showroom sections"
        items={TABLINK_ITEMS.map((item, i) => ({ ...item, active: i === active }))}
      />
      <span style={hintStyle}>
        Active is demo state here; in real use each tab navigates and the consumer
        recomputes active from the route.
      </span>
    </div>
  );
}

const searchResultListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2xs)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--type-sm)",
  color: "var(--text-positive-secondary)",
};

const hintStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-tertiary)",
};

// The AppShell showroom demo: the composed shell (TopBar + NavRail + content)
// with live state, on the oversized-chrome frame treatment. AppShell's topBar
// and navRail slots are render props, so the composition must live in this
// client module (a function prop does not cross the server/client boundary
// from the showroom's server render). The frame trick: the shell is
// full-viewport chrome (min-height 100vh; below the desktop breakpoint the
// rail and backdrop are position: fixed), so a transform on the frame makes it
// the containing block for the fixed pieces and overflow hidden clips the
// viewport-height body into a bounded stage.
const shellFrameStyle: CSSProperties = {
  transform: "translateZ(0)",
  height: "24rem",
  width: "100%",
  overflow: "hidden",
  border: "1px dashed var(--border-positive-secondary)",
  borderRadius: "var(--component-radius)",
};

const shellContentStyle: CSSProperties = {
  padding: "var(--space-lg)",
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-tertiary)",
};

// The shell's own geometry is viewport-based (min-height 100vh, the desktop
// rail at calc(100vh - bar)); inside the bounded stage that would push the
// rail's foot control below the frame fold. These structural overrides bind
// the shell to the frame height instead, so the whole shell (foot control
// included) is visible. Demo-scoped, structural values only.
const shellDemoCss = `
[data-mw-shell-demo] [data-mw-appshell] { min-height: 100%; height: 100%; }
@media (min-width: 1024px) { /* --mw-bp-desktop */
  [data-mw-shell-demo] [data-mw-appshell] [data-mw-appshell-rail] { height: 100%; top: 0; }
}
`;

export function ShowroomAppShellDemo() {
  return (
    <div style={shellFrameStyle} data-mw-shell-demo="">
      <style href="magentaweb-appshell-demo" precedence="default">{shellDemoCss}</style>
      <AppShell
        mainId="sr-appshell-main"
        // The page this demo sits on already owns a <main> (a fork's (site) layout, the
        // mother's HQ shell); a second landmark inside the demo makes AT navigation
        // ambiguous (A-102). AppShellDemo takes the same opt-out; this was the missed member.
        mainLandmark={false}
        topBar={({ mobileOpen, toggle, collapsed }) => (
          <TopBar
            onToggle={toggle}
            mobileOpen={mobileOpen}
            collapsed={collapsed}
            // Current shell brand: BrandLockup (mark + hairline divider + name),
            // collapsing to the bare mark alone as the rail collapses.
            brand={<BrandLockup mark={<BrandMark href="#sh-home" size="2rem" title="Showroom" />} name="Showroom" />}
            brandCollapsed={<BrandMark href="#sh-home" size="2rem" title="Showroom" />}
            utilities={<Button variant="ghost" size="sm" href="#log-out">Log out</Button>}
          />
        )}
        navRail={({ collapsed, toggle }) => (
          <NavRail
            ariaLabel="Showroom shell"
            collapsed={collapsed}
            onToggle={toggle}
            // Theme toggle at the rail foot, grouped with the Collapse control.
            themeToggle
            items={[
              { href: "#sh-home", label: "Home", icon: <Home size={20} /> },
              { href: "#sh-works", label: "Works", icon: <Folders size={20} />, active: true },
              { href: "#sh-settings", label: "Settings", icon: <Settings size={20} /> },
            ]}
          />
        )}
      >
        <div style={shellContentStyle}>
          <p style={{ margin: 0 }}>
            The content region. The rail&apos;s foot control collapses it to icons and this
            region widens; below the desktop breakpoint the hamburger opens the rail as an
            overlay.
          </p>
        </div>
      </AppShell>
    </div>
  );
}

export function ShowroomChatComposerDemo() {
  // The live loop: sends append to a small thread above the composer, so the
  // demo exercises the real contract (trimmed value in, uncontrolled clear
  // after send) without any API. The rate-limited row below is the state
  // catalog: the alert line replaces the helper and send stands down.
  const [sent, setSent] = useState<string[]>([]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", width: "100%", maxWidth: "34rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        <ChatMessage role="assistant" speaker="Companion" content="Ask anything; sends land in this thread." />
        {sent.map((text, i) => (
          <ChatMessage key={i} role="user" content={text} />
        ))}
      </div>
      <ChatComposer
        id="sr-chat-composer"
        aria-label="Message the companion"
        placeholder="Ask about the current piece"
        helperText="Enter to send · Shift+Enter for a new line"
        onSend={(text) => setSent((prev) => [...prev, text])}
      />
      <ChatComposer
        id="sr-chat-composer-limited"
        aria-label="Rate-limited composer"
        placeholder="Send stands down while the limit holds"
        rateLimited
      />
    </div>
  );
}

// The TopBar identity + action set (v4.4.0). BrandLockup is the brand slot's
// mark + faint divider + name; HelpButton opens the tabbed keyboard-shortcuts
// modal; NotificationsButton opens its feed panel (empty state until a product
// supplies one). The three sit together as the app top bar's standard kit.
export function ShowroomBrandLockupDemo() {
  return <BrandLockup mark={<BrandMark href="#" size="2rem" />} name="Product name" />;
}

// The kit ships to every fork, so the demo plate is the mother's store URL as a literal (ASSETS-4),
// never a fork's slot; the opacities shown are the showroom loop's own, measured.
const SHOWROOM_PLATE_LOOP = "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-plate-loop-07d75878.mp4";
const SHOWROOM_PLATE_POSTER = "https://putl0nxdpoepzh5o.public.blob.vercel-storage.com/assets/showroom-plate-poster-57320ab7.webp";
export function ShowroomHeroPlateDemo() {
  return (
    <div style={{ position: "relative", overflow: "hidden", padding: "var(--space-2xl) var(--space-xl)", background: "var(--background-positive-primary)" }}>
      <HeroPlate src={SHOWROOM_PLATE_LOOP} poster={SHOWROOM_PLATE_POSTER} light={0.18} dark={0.35} mask="pool" focus="66% 50%" />
      <div style={{ position: "relative", maxWidth: "24ch" }}>
        <Heading level={3} size={3} as="p">Your vision. Realized.</Heading>
      </div>
    </div>
  );
}

export function ShowroomBrandWordmarkDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", alignItems: "flex-start" }}>
      <BrandWordmark name="Alder Architecture" />
      <BrandWordmark name="Alder Architecture" size="footer" />
      <BrandWordmark name="Alder Architecture" status="standin">
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-xs)", fontFamily: "var(--font-display)", fontSize: "var(--type-lg)", fontWeight: 600 }}>
          <span aria-hidden="true" style={{ width: "1.25rem", height: "1.25rem", borderRadius: "50%", border: "2px solid currentColor" }} />
          Alder
        </span>
      </BrandWordmark>
    </div>
  );
}

const SHOWROOM_SHORTCUTS = [
  {
    title: "Global",
    items: [
      { keys: ["Cmd", "K"], label: "Open the command menu" },
      { keys: ["/"], label: "Focus search" },
      { keys: ["?"], label: "Open this help" },
    ],
  },
];

export function ShowroomHelpModalDemo() {
  return <HelpButton shortcuts={SHOWROOM_SHORTCUTS} />;
}

export function ShowroomNotificationsDemo() {
  return <NotificationsButton count={2} emptyDescription="A product's notification feed renders here." />;
}

// v4.5.0 app-primitive demos that need client state/handlers (a server showroom
// can't pass functions to a client component, so these live here).
export function ShowroomFormModalDemo() {
  return (
    <FormModal
      trigger={{ label: "Edit specs", variant: "secondary" }}
      title="Edit specs"
      description="Remounts on open, so an abandoned draft never lingers."
      onSubmit={async () => {
        await new Promise((r) => setTimeout(r, 400));
        return { ok: true };
      }}
    >
      <TextField id="fm-title" name="title" label="Title" defaultValue="Low tide, no. 3" />
      <TextField id="fm-size" name="size" label="Size" defaultValue="10 x 10 in" />
    </FormModal>
  );
}

export function ShowroomFileUploadDemo() {
  const [names, setNames] = useState<string[]>([]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", maxWidth: "32rem", width: "100%" }}>
      <FileUpload
        accept="image/*"
        multiple
        label="Add photos"
        hint="PNG or JPG, drag them in or click"
        onFiles={(files) => setNames(files.map((f) => f.name))}
      />
      <span style={hintStyle}>{names.length ? `Picked: ${names.join(", ")}` : "Nothing picked yet."}</span>
    </div>
  );
}

export function ShowroomBulkActionBarDemo() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)", minHeight: "6rem", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
        <Button variant="secondary" size="sm" onClick={() => setCount((c) => c + 1)}>Select one more</Button>
        <span style={hintStyle}>{count} selected. The bar appears below.</span>
      </div>
      <BulkActionBar
        count={count}
        onClear={() => setCount(0)}
        position="bottom"
        actions={[
          { label: "Transfer", onClick: () => {} },
          { label: "Delete", destructive: true, onClick: () => setCount(0) },
        ]}
      />
    </div>
  );
}
