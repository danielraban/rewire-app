import { z } from "zod";
import { CARE, MILES, PAY, search, type Care, type Pay } from "@/lib/finder";
import { limited } from "@/lib/http";

// POST so the ZIP code never lands in a URL or a request log. Nothing here is logged or stored.
export const dynamic = "force-dynamic";

const Body = z.object({
  zip: z.string().regex(/^\d{5}$/),
  care: z.enum(Object.keys(CARE) as [Care, ...Care[]]),
  pay: z.enum(Object.keys(PAY) as [Pay, ...Pay[]]),
  miles: z.number().refine((m) => (MILES as readonly number[]).includes(m)),
});

export async function POST(req: Request) {
  if (limited(req, 30)) return Response.json({ error: "Too many searches. Try again in a minute." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a 5-digit ZIP code." }, { status: 400 });
  try {
    const results = await search(parsed.data);
    if (!results) return Response.json({ error: "We don't know that ZIP code." }, { status: 400 });
    return Response.json({ results });
  } catch {
    return Response.json({ error: "The treatment locator is not answering. Try again soon, or call 1-800-662-4357." }, { status: 502 });
  }
}
