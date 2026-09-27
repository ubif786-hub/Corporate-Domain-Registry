import brand from "../../../brand.json";

// Publishes the brand manifest for the HQ Brand tab, which reads it from the deploy rather than
// from the repo (staging first, production as fallback). Statically generated, so a brand change
// ships with the deploy and the tab can never disagree with what is live.

export async function GET() {
  return Response.json({
    project: "domain-services",
    generatedFrom: "brand.json",
    brand,
  });
}
