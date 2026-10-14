/**
 * Public facts about REWIRE. Watched addresses live in code, not the database, so every change
 * to what the Sentinel follows is a reviewed commit in this public repository.
 */
export const MINT = "4ATdP8A1aao3VizaPNitigGmZg5ymrj8efPEx3BYYMAH";
/** Launched under the old name; its fees still reach the same treasury. */
export const RETIRED_MINT = "4kM5UF8xGKFf11SsCgD4ddVPad4sommYwJYsfjTSmJak";
export const TREASURY = "8NAo8r5f3tL6uU2fPYis4o9n7i7RWo4K15CKCdEcruyP";
/** pump.fun creator vault of the treasury: creatorVaultPda(TREASURY) from @pump-fun/pump-sdk. */
export const CREATOR_VAULT = "63z1H9pAzSYwgyUdrLG3S2b1ymiRfLKbCaEg98eR3jLJ";

export type Role = "treasury" | "creator_vault";
export interface Watched {
  address: string;
  label: string;
  role: Role;
}
export const WATCHED: Watched[] = [
  { address: TREASURY, label: "Treasury", role: "treasury" },
  { address: CREATOR_VAULT, label: "Creator fee vault", role: "creator_vault" },
];

/** Share of collected fees reserved for grants; the rest pays operations (SPEC.md). */
export const GRANT_SHARE_PCT = 90n;

export const CRISIS = {
  call: "988",
  samhsa: "1-800-662-4357",
};

/**
 * Plain-language explanations for flagged treasury movements, keyed by transaction signature.
 * Published next to the flag; the flag itself stays.
 */
export const EXPLAINED: Record<string, string> = {
  "2Ao6R6U2s4N1bEQqKNUciemUKqrigVANYQdQpva6vud45tvWNCujUEr1kGtGtoVx9KHNJi1TYRePNnS23ChkdoVg":
    "Launch costs: 0.02 SOL to the launch wallet (7wDLEv…YTrN) that created the coin.",
  NYgK9zYoiJKqgT8GwjCYSAJe5mPD9zuoDB5GXqe6Uq4BuVbtS22fzaCmyV3ZLRXn6D7RKdDWB2jyGD4t7QBUPD4:
    "Withdrawal to the owner's personal wallet. It returned the 0.1603 SOL left of the owner's " +
    "own launch funding (0.1803 SOL paid in earlier that day) plus 0.0081 SOL of collected " +
    "creator fees.",
};
