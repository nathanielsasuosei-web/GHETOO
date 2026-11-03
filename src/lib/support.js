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

/** `false` means the artist has chosen one exact price instead of a floor. */
export function allowsCustomSupport(value) {
  return value !== false;
}

export function supportChoices(minimum, allowCustom = true) {
  const floor = supportMinimum(minimum);
  return allowsCustomSupport(allowCustom) ? supportPresets(floor) : [floor];
}

/** Prefix used beside a price: "from GH₵ 5" for tips, "GH₵ 5" for a fixed price. */
export function supportPricePrefix(allowCustom = true) {
  return allowsCustomSupport(allowCustom) ? 'from ' : '';
}
