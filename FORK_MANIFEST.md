# Fork manifest

What this fork initialised and changed when it was created from the magentaweb design system
(magentaweb-starter). A fork inherits the components and tokens AS-IS and never edits them; it only
substitutes its name, pins the system version, scaffolds placeholder content, and strips the mother's
app layer. This is the record of those deltas, so the fork is self-documenting.

## Identity
- Name: `domain-services`. Substituted at fork time into: package.json (name), the root layout title, the
  (site) nav + footer wordmark and copyright, the /studio hero, and the seeded docs.
- Design-system pin: see package.json -> magentaweb (that is the pin of record). Forked at v5.2.0. Inherited, not edited.

## Inherited AS-IS (not modified)
- The design system: src/components/** (minus docs) and the token files. Every component is the
  mother's, byte-identical. The point of the system: everything is forkable as-is.
- The kit pages: /style-guide (the client brand sheet) and /components (the live showroom) are thin
  BARE mounts of the synced kit (StyleGuidePage, ComponentsShowroom, with kit-manifest.json, in
  src/components/kit/). Bare = no children, so zero studio panels; the pages this fork serves are
  the exact pages the studio sees. Their content moves when the design system syncs forward, never
  by editing here.
- The (site) chrome (Nav, Footer) is the mother's component. This fork only CONFIGURES it via props in
  src/app/(site)/layout.tsx (nav links, footer columns + social, copyright). Changing those props is
  configuration, not a component change. (Superseded 23 Aug 2026: draft 2 replaced Nav/Footer with
  the fork-owned SiteHeader/RouteTabs/SiteFooter shell.)

## Scaffolded (placeholder, replace with real content)
- src/app/(site)/layout.tsx: Nav with all three link kinds (a plain link, a dropdown menu, a mega
  menu) and Footer with columns + social icons.
- src/app/(site)/studio/page.tsx: a generic homepage; / redirects to it.
- src/app/(site)/style-guide/page.tsx and src/app/(site)/components/page.tsx: the two kit mount
  files (noindexed, unlinked; see Inherited). The mount files are scaffolded; their content is the
  kit's and is NOT placeholder, so they stay as they are.

## Stripped (mother-only, removed)
- The docs site, the HQ dashboard, the access gate, the docs-only components, the sync + fork tooling,
  and the mother's internal docs. Exact list: FORK_PROTOCOL.md in the mother.

## Regenerated / created
- package-lock.json regenerated to carry this fork's name.
- Repo created private at magenta-web/domain-services and pushed.
- Continuity docs seeded: README, CLAUDE, HANDOFF, SESSION_LOG, and this manifest.
