"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { normaliseDomain } from "@/data/lookup";
import { SearchPanel } from "./search/SearchPanel";
import { WhoisLookup } from "./whois/WhoisLookup";
import { RenewPanel } from "./renew/RenewPanel";

/* THE TYPED DOMAIN IS READ IN THE BROWSER, NOT ON THE SERVER (20 Sep 2026).
 *
 * The five lookup pages used to `await searchParams` in the page component, which makes each one
 * a per-request server render. The site is moving to the client's own cPanel hosting, which serves
 * files and runs no Node, so a page may not need a server to exist. Nothing about the lookup ever
 * did: the lookups run in the browser, against the API.
 * Only the read of `?domain=` was server-side, and this is that read, moved.
 *
 * `useSearchParams` needs a Suspense boundary above it or a static build bails out of prerendering
 * the whole page; the fallback is the same panel with no domain, which is what the page shows
 * before anything is typed, so there is no flash of a different layout.
 *
 * Keyed on the domain, as before, so a link to a different result re-mounts the panel.
 */

function useDomainParam(): string {
  const raw = useSearchParams().get("domain");
  return raw ? normaliseDomain(raw) : "";
}

function SearchPanelInner() {
  const domain = useDomainParam();
  return <SearchPanel key={domain} domain={domain} />;
}

export function SearchPanelFromUrl() {
  return (
    <Suspense fallback={<SearchPanel domain="" />}>
      <SearchPanelInner />
    </Suspense>
  );
}

function WhoisLookupInner() {
  const domain = useDomainParam();
  return <WhoisLookup key={domain} initial={domain} />;
}

export function WhoisLookupFromUrl() {
  return (
    <Suspense fallback={<WhoisLookup initial="" />}>
      <WhoisLookupInner />
    </Suspense>
  );
}

function RenewPanelInner() {
  const domain = useDomainParam();
  return <RenewPanel key={domain} domain={domain} />;
}

export function RenewPanelFromUrl() {
  return (
    <Suspense fallback={<RenewPanel domain="" />}>
      <RenewPanelInner />
    </Suspense>
  );
}
