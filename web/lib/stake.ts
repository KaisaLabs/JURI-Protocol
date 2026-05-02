const MINIMUM_STAKE = 0.001;
const DECIMAL_STAKE_PATTERN = /^\d+(?:\.\d+)?$/;

export const INVALID_STAKE_ERROR = `Stake must be a numeric value of at least ${MINIMUM_STAKE.toFixed(3)} 0G.`;

export function parseStakeInput(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = input.trim();

  if (!DECIMAL_STAKE_PATTERN.test(value)) {
    return { ok: false, error: INVALID_STAKE_ERROR };
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < MINIMUM_STAKE) {
    return { ok: false, error: INVALID_STAKE_ERROR };
  }

  return { ok: true, value };
}
