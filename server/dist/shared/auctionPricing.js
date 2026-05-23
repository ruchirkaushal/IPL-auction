"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPriceValue = exports.formatPrice = exports.formatCroresValue = exports.formatCroresWithCurrency = exports.formatCrores = exports.getFormattedBasePrices = exports.parsePrice = exports.formatAuctionMoneyValue = exports.formatAuctionMoneyWithCurrency = exports.formatAuctionMoney = exports.isValidBasePrice = exports.isValidBidAmount = exports.getNextBid = exports.getBidIncrement = exports.normalizeBasePrice = exports.shouldDisplayInLakhs = exports.lakhsToCrores = exports.croresToLakhs = exports.toSafeLakhs = exports.BASE_PRICE_SLABS = exports.CRORE_DISPLAY_THRESHOLD_LAKHS = exports.MIN_BID_UNIT_LAKHS = exports.LAKHS_PER_CRORE = void 0;
exports.LAKHS_PER_CRORE = 100;
exports.MIN_BID_UNIT_LAKHS = 5;
exports.CRORE_DISPLAY_THRESHOLD_LAKHS = exports.LAKHS_PER_CRORE;
// Official IPL base price slabs (in Lakhs)
exports.BASE_PRICE_SLABS = [30, 75, 100, 125, 150, 200];
const DEFAULT_BASE_PRICE = exports.BASE_PRICE_SLABS[0];
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
/**
 * Round any raw monetary input into the project's internal whole-lakh unit.
 */
const toSafeLakhs = (value) => {
    if (!isFiniteNumber(value))
        return 0;
    return Math.max(0, Number(value.toFixed(0)));
};
exports.toSafeLakhs = toSafeLakhs;
/**
 * Convenience converter for callers that have a Crores amount and want
 * to opt into the safe integer-lakh representation used everywhere else.
 */
const croresToLakhs = (crores) => {
    if (!isFiniteNumber(crores))
        return 0;
    return (0, exports.toSafeLakhs)(crores * exports.LAKHS_PER_CRORE);
};
exports.croresToLakhs = croresToLakhs;
/**
 * Convert the internal lakh representation into a Crores number.
 */
const lakhsToCrores = (lakhs) => {
    return (0, exports.toSafeLakhs)(lakhs) / exports.LAKHS_PER_CRORE;
};
exports.lakhsToCrores = lakhsToCrores;
const shouldDisplayInLakhs = (lakhs) => {
    return (0, exports.toSafeLakhs)(lakhs) < exports.CRORE_DISPLAY_THRESHOLD_LAKHS;
};
exports.shouldDisplayInLakhs = shouldDisplayInLakhs;
/**
 * Normalize a price to the nearest official IPL base price slab.
 * Input and output are both Lakhs.
 */
const normalizeBasePrice = (price) => {
    const normalizedPrice = (0, exports.toSafeLakhs)(price);
    if (normalizedPrice <= 0)
        return DEFAULT_BASE_PRICE;
    let closest = DEFAULT_BASE_PRICE;
    let minDiff = Math.abs(normalizedPrice - closest);
    for (const slab of exports.BASE_PRICE_SLABS) {
        const diff = Math.abs(normalizedPrice - slab);
        if (diff < minDiff || (diff === minDiff && slab > closest)) {
            minDiff = diff;
            closest = slab;
        }
    }
    return closest;
};
exports.normalizeBasePrice = normalizeBasePrice;
/**
 * Get the IPL bid increment for the current bid amount.
 * Input and output are both Lakhs.
 */
const getBidIncrement = (currentBid) => {
    const bid = (0, exports.toSafeLakhs)(currentBid);
    if (bid < 100)
        return 5; // Up to ₹1.00 Cr
    if (bid < 200)
        return 10; // ₹1.00 Cr to below ₹2.00 Cr
    if (bid < 500)
        return 20; // ₹2.00 Cr to below ₹5.00 Cr
    return 25; // ₹5.00 Cr and above
};
exports.getBidIncrement = getBidIncrement;
/**
 * Get the next valid bid amount for the auction.
 * Input and output are both Lakhs.
 */
const getNextBid = (currentBid, basePrice) => {
    const bid = (0, exports.toSafeLakhs)(currentBid);
    const normalizedBasePrice = (0, exports.normalizeBasePrice)(basePrice);
    if (bid <= 0) {
        return normalizedBasePrice;
    }
    return (0, exports.toSafeLakhs)(bid + (0, exports.getBidIncrement)(bid));
};
exports.getNextBid = getNextBid;
/**
 * Validate that an incoming bid exactly matches the next legal bid amount.
 */
const isValidBidAmount = (amount, currentBid, basePrice) => {
    return (0, exports.toSafeLakhs)(amount) === (0, exports.getNextBid)(currentBid, basePrice);
};
exports.isValidBidAmount = isValidBidAmount;
/**
 * Check whether a value is already one of the official IPL base price slabs.
 */
const isValidBasePrice = (price) => {
    return exports.BASE_PRICE_SLABS.includes((0, exports.toSafeLakhs)(price));
};
exports.isValidBasePrice = isValidBasePrice;
/**
 * Format a lakh amount using auction display rules:
 * - below 1.00 Cr => "xx Lakhs"
 * - at or above 1.00 Cr => "x.xx Cr"
 */
const formatAuctionMoney = (lakhs) => {
    const safeLakhs = (0, exports.toSafeLakhs)(lakhs);
    if ((0, exports.shouldDisplayInLakhs)(safeLakhs)) {
        return `${safeLakhs} Lakhs`;
    }
    return `${(0, exports.lakhsToCrores)(safeLakhs).toFixed(2)} Cr`;
};
exports.formatAuctionMoney = formatAuctionMoney;
/**
 * Optional currency-prefixed variant for places that want the rupee symbol.
 */
const formatAuctionMoneyWithCurrency = (lakhs) => {
    return `₹${(0, exports.formatAuctionMoney)(lakhs)}`;
};
exports.formatAuctionMoneyWithCurrency = formatAuctionMoneyWithCurrency;
/**
 * Numeric-only variant for animation or compact UI.
 * - below 1.00 Cr => "xx"
 * - at or above 1.00 Cr => "x.xx"
 */
const formatAuctionMoneyValue = (lakhs) => {
    const safeLakhs = (0, exports.toSafeLakhs)(lakhs);
    if ((0, exports.shouldDisplayInLakhs)(safeLakhs)) {
        return safeLakhs.toString();
    }
    return (0, exports.lakhsToCrores)(safeLakhs).toFixed(2);
};
exports.formatAuctionMoneyValue = formatAuctionMoneyValue;
/**
 * Parse a user-provided price string/number into the internal lakh unit.
 * Strings may contain "Cr" or "L". Plain numbers are treated as Lakhs.
 */
const parsePrice = (value) => {
    if (typeof value === 'number') {
        return (0, exports.toSafeLakhs)(value);
    }
    const trimmed = value.trim();
    const numericValue = Number.parseFloat(trimmed.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(numericValue)) {
        return 0;
    }
    if (/cr/i.test(trimmed)) {
        return (0, exports.croresToLakhs)(numericValue);
    }
    return (0, exports.toSafeLakhs)(numericValue);
};
exports.parsePrice = parsePrice;
/**
 * Get all official base price slabs in auction display format.
 */
const getFormattedBasePrices = () => {
    return exports.BASE_PRICE_SLABS.map(exports.formatAuctionMoney);
};
exports.getFormattedBasePrices = getFormattedBasePrices;
// Backward-compatible aliases for existing imports.
exports.formatCrores = exports.formatAuctionMoney;
exports.formatCroresWithCurrency = exports.formatAuctionMoneyWithCurrency;
exports.formatCroresValue = exports.formatAuctionMoneyValue;
exports.formatPrice = exports.formatAuctionMoney;
exports.formatPriceValue = exports.formatAuctionMoneyValue;
