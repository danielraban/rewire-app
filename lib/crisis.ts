/**
 * Crisis language check that runs before any model call. A match shows crisis lines first and
 * stops the Guide. It errs toward showing the lines: a false positive costs a few seconds, a
 * miss could cost a life.
 */
const PATTERNS = [
  /\b(kill|hurt|harm)(ing)?\s+(my\s*self|myself)\b/i,
  /\bsuicid/i,
  /\b(end|take)\s+(my|our)\s+(own\s+)?li(fe|ves)\b/i,
  /\bwant(s|ed)?\s+to\s+die\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive|wake\s+up)\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\boverdos(e|ed|ing)\b/i,
  /\b(od'?d|o\.d\.)\b/i,
  /\bnot\s+breathing\b/i,
  /\bunresponsive\b/i,
  /\b(seizure|seizing)\b/i,
];

export const isCrisis = (text: string) => PATTERNS.some((p) => p.test(text));
