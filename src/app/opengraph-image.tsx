import { ImageResponse } from "next/og";
import { SITE } from "@/data/site";

/* The fork's share card: the client name on the night field. Swapped in at
   fork time (the mother's card carries the magentaweb brand square, which no
   client site should serve; 29 Jul audit, A-089). Neutral by design: rebrand
   it with the client's colors as part of the launch checklist's OG item.
   Hexes are sanctioned literals (satori renders outside the token pipeline).
   Type is literal too, and by the same sanction: satori cannot read CSS custom
   properties, so the px sizes are the card's own geometry. It renders with
   next/og's bundled default face, Geist Regular at weight 400 ONLY, unless an
   ImageResponse `fonts` option supplies a file; a fontWeight above 400 here is
   silently drawn at 400, which is why none is asked (typography audit, 23 Aug
   2026). To carry the brand face at a heavier weight, pass a TTF / OTF / WOFF
   (not woff2) through `fonts`. */

// FK-7 sibling (skeptic pass, 27 Aug 2026). The card carried the brand as a literal in two
// places while src/data/site.ts is this fork's declared single source for it ("Pages render
// from here and nowhere else"). TRIAGE decision 3 keeps SITE.name neutral only until the client
// names the company, so a literal here is a card that silently keeps the OLD name on the day
// the site takes the new one. Reading SITE.name is a rename, not a redesign: the string is
// "Domain services" today, so the rendered PNG and og:image:alt are unchanged: measured against
// a dev server, /opengraph-image is 200 image/png at 26323 bytes and og:image:alt reads
// "Domain services" BOTH ways, and the two PNGs compare byte-identical. The descriptor half of
// the fleet's "<brand>: <what the site is>" shape is deliberately NOT added here: the root title
// already makes that claim, and extending a client-facing share card is a copy call for the
// owner, not a skeptic's repair. See the hand-up.
// Drawn once at build time, so the static export can carry it as a file.
export const dynamic = "force-static";

export const alt = SITE.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          background: "#101417",
        }}
      >
        {/* Drawn from SITE.name for the same reason as the alt above: the visible half of the
            card carried the second copy of the literal. */}
        <div style={{ fontSize: 72, color: "#F7F8F9", display: "flex" }}>
          {SITE.name}
        </div>
      </div>
    ),
    size,
  );
}
