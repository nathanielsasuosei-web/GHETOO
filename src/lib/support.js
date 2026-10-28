// Amounts are stored in pesewas to avoid floating-point payment calculations.
export const MIN_SUPPORT_PESEWAS = 100;
export const MAX_SUPPORT_PESEWAS = 5_000_000;

export function isValidSupportMinimum(value) {
  return Number.isSafeInteger(value) && value >= MIN_SUPPORT_PESEWAS && value <= MAX_SUPPORT_PESEWAS;
}

export function supportMinimum(value) {
  return isValidSupportMinimum(value) ? value : MIN_SUPPORT_PESEWAS;
}

/** Presets never fall below the artist's minimum or above the checkout limit. */
export function supportPresets(minimum) {
  const floor = supportMinimum(minimum);
  return [1, 2, 5, 10].map((factor) => floor * factor).filter((value) => value <= MAX_SUPPORT_PESEWAS);
}
