/**
 * IPL-style Auction Pricing System
 *
 * Internal storage:
 * - All monetary values are stored as whole Lakhs
 * - 1.00 Cr = 100 Lakhs
 * - 0.05 Cr = 5 Lakhs
 *
 * Display:
 * - Values below 1.00 Cr render as Lakhs
 * - Values at or above 1.00 Cr render as x.xx Cr
 */

export const LAKHS_PER_CRORE = 100;
export const MIN_BID_UNIT_LAKHS = 5;
export const CRORE_DISPLAY_THRESHOLD_LAKHS = LAKHS_PER_CRORE;

// Official IPL base price slabs (in Lakhs)
export const BASE_PRICE_SLABS = [30, 75, 100, 125, 150, 200] as const;

const DEFAULT_BASE_PRICE = BASE_PRICE_SLABS[0];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Round any raw monetary input into the project's internal whole-lakh unit.
 */
export const toSafeLakhs = (value: number): number => {
  if (!isFiniteNumber(value)) return 0;
  return Math.max(0, Number(value.toFixed(0)));
};

/**
 * Convenience converter for callers that have a Crores amount and want
 * to opt into the safe integer-lakh representation used everywhere else.
 */
export const croresToLakhs = (crores: number): number => {
  if (!isFiniteNumber(crores)) return 0;
  return toSafeLakhs(crores * LAKHS_PER_CRORE);
};

/**
 * Convert the internal lakh representation into a Crores number.
 */
export const lakhsToCrores = (lakhs: number): number => {
  return toSafeLakhs(lakhs) / LAKHS_PER_CRORE;
};

export const shouldDisplayInLakhs = (lakhs: number): boolean => {
  return toSafeLakhs(lakhs) < CRORE_DISPLAY_THRESHOLD_LAKHS;
};

/**
 * Normalize a price to the nearest official IPL base price slab.
 * Input and output are both Lakhs.
 */
export const normalizeBasePrice = (price: number): number => {
  const normalizedPrice = toSafeLakhs(price);
  if (normalizedPrice <= 0) return DEFAULT_BASE_PRICE;

  let closest: number = DEFAULT_BASE_PRICE;
  let minDiff = Math.abs(normalizedPrice - closest);

  for (const slab of BASE_PRICE_SLABS) {
    const diff = Math.abs(normalizedPrice - slab);

    if (diff < minDiff || (diff === minDiff && slab > closest)) {
      minDiff = diff;
      closest = slab;
    }
  }

  return closest;
};

/**
 * Get the IPL bid increment for the current bid amount.
 * Input and output are both Lakhs.
 */
export const getBidIncrement = (currentBid: number): number => {
  const bid = toSafeLakhs(currentBid);

  if (bid < 100) return 5;   // Up to ₹1.00 Cr
  if (bid < 200) return 10;  // ₹1.00 Cr to below ₹2.00 Cr
  if (bid < 500) return 20;  // ₹2.00 Cr to below ₹5.00 Cr
  return 25;                 // ₹5.00 Cr and above
};

/**
 * Get the next valid bid amount for the auction.
 * Input and output are both Lakhs.
 */
export const getNextBid = (currentBid: number, basePrice: number): number => {
  const bid = toSafeLakhs(currentBid);
  const normalizedBasePrice = normalizeBasePrice(basePrice);

  if (bid <= 0) {
    return normalizedBasePrice;
  }

  return toSafeLakhs(bid + getBidIncrement(bid));
};

/**
 * Validate that an incoming bid exactly matches the next legal bid amount.
 */
export const isValidBidAmount = (
  amount: number,
  currentBid: number,
  basePrice: number
): boolean => {
  return toSafeLakhs(amount) === getNextBid(currentBid, basePrice);
};

/**
 * Check whether a value is already one of the official IPL base price slabs.
 */
export const isValidBasePrice = (price: number): boolean => {
  return BASE_PRICE_SLABS.includes(toSafeLakhs(price) as (typeof BASE_PRICE_SLABS)[number]);
};

/**
 * Format a lakh amount using auction display rules:
 * - below 1.00 Cr => "xx Lakhs"
 * - at or above 1.00 Cr => "x.xx Cr"
 */
export const formatAuctionMoney = (lakhs: number): string => {
  const safeLakhs = toSafeLakhs(lakhs);

  if (shouldDisplayInLakhs(safeLakhs)) {
    return `${safeLakhs} Lakhs`;
  }

  return `${lakhsToCrores(safeLakhs).toFixed(2)} Cr`;
};

/**
 * Optional currency-prefixed variant for places that want the rupee symbol.
 */
export const formatAuctionMoneyWithCurrency = (lakhs: number): string => {
  return `₹${formatAuctionMoney(lakhs)}`;
};

/**
 * Numeric-only variant for animation or compact UI.
 * - below 1.00 Cr => "xx"
 * - at or above 1.00 Cr => "x.xx"
 */
export const formatAuctionMoneyValue = (lakhs: number): string => {
  const safeLakhs = toSafeLakhs(lakhs);

  if (shouldDisplayInLakhs(safeLakhs)) {
    return safeLakhs.toString();
  }

  return lakhsToCrores(safeLakhs).toFixed(2);
};

/**
 * Parse a user-provided price string/number into the internal lakh unit.
 * Strings may contain "Cr" or "L". Plain numbers are treated as Lakhs.
 */
export const parsePrice = (value: string | number): number => {
  if (typeof value === 'number') {
    return toSafeLakhs(value);
  }

  const trimmed = value.trim();
  const numericValue = Number.parseFloat(trimmed.replace(/[^0-9.]/g, ''));

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  if (/cr/i.test(trimmed)) {
    return croresToLakhs(numericValue);
  }

  return toSafeLakhs(numericValue);
};

/**
 * Get all official base price slabs in auction display format.
 */
export const getFormattedBasePrices = (): string[] => {
  return BASE_PRICE_SLABS.map(formatAuctionMoney);
};

// Backward-compatible aliases for existing imports.
export const formatCrores = formatAuctionMoney;
export const formatCroresWithCurrency = formatAuctionMoneyWithCurrency;
export const formatCroresValue = formatAuctionMoneyValue;
export const formatPrice = formatAuctionMoney;
export const formatPriceValue = formatAuctionMoneyValue;
