import { readPublicContent } from "../../../services/content-source.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await readPublicContent();
  return Response.json(content, { headers: {
    "Cache-Control": "no-store",
    "X-Portfolio-Content": content.isStatic ? "static" : "live",
  } });
}
