"use client";

import { CSSProperties, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { srOnly } from "@/components/internal/styles";
import { isPlausibleDomain, normaliseDomain } from "@/data/lookup";

/* The one search field, the product's front door: an input and a button in a row. Every search
   surface on the site renders THIS component and no other, which is the whole point of it.

   IT CARRIES NO SERVICE, and that is the alignment made 4 Sep 2026 after the owner said our
   search read as nothing like the reference. Measured on bltz.com with a real browser: its form
   is a single field posting to /search with the domain and nothing else. A visitor never tells
   the site whether they mean to register, transfer or renew, because the site can work that out
   from the answer: a free domain is a registration, a taken one is a renewal or a transfer.
   Asking first was the divergence. */

const formStyle: CSSProperties = {
  display: "flex",
  gap: "var(--space-xs)",
  alignItems: "flex-end",
  width: "100%",
};

const fieldStyle: CSSProperties = { flex: "1 1 16rem", minWidth: 0 };

export function DomainSearchForm({
  initial = "",
  size = "lg",
  onSearch,
}: {
  initial?: string;
  size?: "md" | "lg";
  /** When set, the form stays on its page and hands the domain over instead of navigating. */
  onSearch?: (domain: string) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const domain = normaliseDomain(value);
    if (!isPlausibleDomain(domain)) {
      setError("Enter a domain with its extension, like myawesomedomain.com");
      return;
    }
    setError(null);
    if (onSearch) onSearch(domain);
    else router.push(`/search?domain=${encodeURIComponent(domain)}`);
  }

  return (
    <form onSubmit={submit} style={formStyle} role="search" aria-label="Domain search" data-ds-search="">
      <div style={fieldStyle}>
        <Input
          id="domain"
          type="text"
          label={<span style={srOnly}>Domain</span>}
          marking="none"
          placeholder="myawesomedomain.com"
          value={value}
          onChange={(v) => { setValue(v); if (error) setError(null); }}
          size={size}
          error={error ?? undefined}
        />
      </div>
      <Button type="submit" variant="primary" size={size}>Search</Button>
    </form>
  );
}
