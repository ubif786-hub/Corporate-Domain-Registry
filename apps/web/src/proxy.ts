import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { comingSoonGateResponse } from "@/comingSoon";

// The pre-launch gate for the whole site. Scaffolded by fork-project.sh (promoted from the
// one-off on a client fork, 3 Sep 2026; backfilled fleet-wide 5 Sep 2026). Next.js 16 renamed
// the middleware file convention to "proxy"; this is the version-correct request-interception
// file, a sibling of src/app/, and it runs BEFORE routes render.
//
// FIRST LINE IS THE SAFETY PROPERTY: with COMING_SOON unset, comingSoonGateResponse() returns
// null on every request and this function falls through to NextResponse.next(). Nothing about
// this file changes any route's behaviour until the env var is set.
//
// THE LOGIC LIVES IN src/comingSoon.ts, not here, so a fork that needs its OWN proxy (an admin
// door, an app login) keeps this gate by composing it in one line at the top of its function
// rather than by copying it. crescent-moon-art, studio-moonlight and tears-of-elune are the
// three live examples (5 Sep 2026).
export function proxy(request: NextRequest) {
  const held = comingSoonGateResponse(request);
  if (held) return held;
  return NextResponse.next();
}

export const config = {
  // COMING_SOON_MATCHER in src/comingSoon.ts, copied literally: Next reads this statically and
  // cannot import it. Everything except Next internals and any path with a dot, i.e. every static file (images, fonts, robots.txt, the manifests).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
