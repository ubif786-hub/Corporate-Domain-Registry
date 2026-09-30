import { PagePanel } from "../PagePanel";
import { SearchPanelFromUrl } from "../DomainFromUrl";
import { assetBySlot } from "@/lib/assets";

/* ONE search experience, four doors. /search, /register, /transfer and /renew are the same page
   with a different heading, which is the reference's anatomy exactly: bltz.com serves four pages
   whose only difference is the h1, all four posting the same single field to the same handler.
   Keeping the three named routes is what stops the bltz alignment from quietly deleting two of
   CDR's services: transfer and renew each keep a first-class URL, a heading and a home-page card,
   and the reference does not even link its own /transfer. */

/* ONE COLUMN, NO CART RAIL (client feedback, 9 Sep 2026). It was results left and a mini-cart in
   the last four tracks of twelve. Their words: "No cart is needed on that page, it may pop up if
   you want but iwog is showing clean interface for people to pick the domain."
 *
 * Nothing is lost by removing it. The header's cart chip already shows the count and the total on
 * every page and links to /cart, so the rail was a second view of state the visitor could already
 * see, occupying a third of the widest page on the site. What it cost was the thing the client
 * actually noticed: the extension lists and the results had two thirds of the width to work in.
 *
 * The four doors (/search, /register, /transfer, /renew) are unchanged; this is the same page
 * with a different heading, which is the reference's anatomy and the reason transfer and renew
 * each keep a first-class URL. */

export function SearchRoute({ title, lede }: { title: string; lede: string }) {
  // The one page that carries a picture behind the frame. Slot-driven, so with nothing recorded
  // the page is exactly as it was and no empty band appears.
  const backdrop = assetBySlot("search-backdrop");
  return (
    <PagePanel title={title} lede={lede} code="Z2" plate={backdrop?.src}>
      {/* The typed domain is read in the browser (DomainFromUrl), so this page needs no server. */}
      <SearchPanelFromUrl />
    </PagePanel>
  );
}
