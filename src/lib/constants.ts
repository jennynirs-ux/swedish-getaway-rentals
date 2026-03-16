// Application-wide constants for magic numbers

export const CACHE_STALE_TIME = 15 * 60 * 1000; // 15 minutes
export const CACHE_GC_TIME = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_SHIPPING_COST = 4900; // in smallest currency unit
export const MAX_BOOKING_ADVANCE_DAYS = 365;
export const MAX_CART_QUANTITY = 99;
export const ITEMS_PER_PAGE = 50;
export const TOAST_DURATION = 5000;
export const MAX_PRICE_RANGE = 10000; // BUG-040: Shared price range constant
export const VAT_RATE = 0.12; // IMP-002: Swedish VAT on short-term rentals is 12%
