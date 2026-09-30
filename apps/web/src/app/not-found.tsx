import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { Flow } from "@/components/Flow";
import { Heading } from "@/components/Heading";
import { Section } from "@/components/Section";

export const metadata: Metadata = {
  title: "Page not found | Corporate Domain Registry",
  robots: { index: false, follow: false },
};

// Standard fork 404, scaffolded by fork-project.sh (promoted from the a client fork
// one-off, 3 Sep 2026). Someone who lands here already knows what they came for, so it offers a
// way back rather than a dead end.
//
// Heading goes through the Heading component, not a bare <h1>: this route sits outside (site),
// so the shell's h1 styling never reaches it, and the base reset leaves a bare h1 at body size.
// Heading size 1 matches every other route's title rung and follows the type dial.
//
// FORK-OWNED, NOT SYNCED: unlike ComingSoonSplash, this page's usefulness comes from links to
// THIS site's actual pages, which the mother cannot know. Replace the placeholder links below
// with the fork's real top-level routes as content lands (see LAUNCH_CHECKLIST.md).
export default function NotFound() {
  return (
    <Section padding="dramatic">
      <Container size="sm">
        <Flow>
          <Heading level={1} size={1}>
            Page not found
          </Heading>
          <p>The page you asked for is not here. Here are some places to start instead.</p>
          <ul data-fork-404-links="">
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/cart">Cart</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <Link href="/disclaimer">Disclaimer</Link>
            </li>
            <li>
              <Link href="/dispute-policy">Dispute Policy</Link>
            </li>
            <li>
              <Link href="/expired-registration-recovery">Expired Registration Recovery</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/register">Register</Link>
            </li>
            <li>
              <Link href="/registrant-resources">Registrant Resources</Link>
            </li>
            <li>
              <Link href="/renew">Renew</Link>
            </li>
            <li>
              <Link href="/search">Search</Link>
            </li>
            <li>
              <Link href="/tos">Tos</Link>
            </li>
            <li>
              <Link href="/transfer">Transfer</Link>
            </li>
            <li>
              <Link href="/whois">Whois</Link>
            </li>
          </ul>
        </Flow>
        <style href="mw-404" precedence="default">
          {css}
        </style>
      </Container>
    </Section>
  );
}

const css = `
[data-fork-404-links] {
  display: grid;
  gap: var(--space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}
`;
