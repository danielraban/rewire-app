/**
 * The Guide agent: one call turns a person's own words into finder filters and a short, kind
 * reply. No memory, no tools, nothing stored. Crisis language is caught before this runs
 * (lib/crisis.ts); the model's own crisis flag is a second net.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CARE, PAY, type Care, type Pay } from "./filters";

const Filters = z.object({
  crisis: z
    .boolean()
    .describe("True if the person or someone with them may be in danger right now."),
  zip: z.string().nullable().describe("A 5-digit US ZIP code the person gave, else null."),
  care: z.enum(Object.keys(CARE) as [Care, ...Care[]]),
  pay: z.enum(Object.keys(PAY) as [Pay, ...Pay[]]),
  reply: z.string().describe("One or two short, warm sentences to the person."),
});
export type GuideOutput = z.infer<typeof Filters>;

const SYSTEM = `You help people in the United States find drug and alcohol treatment. You read what \
someone wrote and choose search filters for a treatment locator.

Filters:
- care: ${Object.entries(CARE)
  .map(([k, v]) => `"${k}" (${v})`)
  .join(", ")}. Use "any" unless they say what they need. Withdrawal symptoms or needing to stop \
safely suggests "detox"; opioids with interest in medication suggests "medication".
- pay: ${Object.entries(PAY)
  .map(([k, v]) => `"${k}" (${v})`)
  .join(", ")}. "No insurance" or "can't afford it" means "assistance".
- zip: only a ZIP code they actually wrote. Never guess one.

Reply in one or two plain sentences: acknowledge them without judgement and say what you will \
search for. If there is no ZIP code, ask for one. Never give medical advice, diagnoses or \
dosing. Never promise a place, a price or an outcome. Set crisis to true if anything suggests \
danger to life right now (suicidal thoughts, an overdose, someone unresponsive).`;

const client = new Anthropic();

/** Null when the model declines or returns nothing usable; the page then shows the form. */
export async function guide(text: string): Promise<GuideOutput | null> {
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(Filters) },
    system: SYSTEM,
    messages: [{ role: "user", content: text }],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}
