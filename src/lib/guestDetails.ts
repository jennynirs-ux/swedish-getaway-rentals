// Format checks for the guest fields on the booking form. The payment function
// only checks the name's length and the bookings table has no rule on the name
// or phone, so these are the only format checks: keep them loose enough for
// every guest's real name and number.

/** Stripe keeps the note in the checkout's metadata, which takes at most 500 characters per value */
export const SPECIAL_REQUESTS_MAX = 500;

/** Room for "+46 (0)70-123 45 67" and similar; the digit count is what is checked */
export const PHONE_INPUT_MAX = 25;

/**
 * Letters in any script (Łukasz, Šimon, Çağrı) with their accents, spaces,
 * dots, hyphens and straight or curly apostrophes (iPhones type O’Brien), and
 * at least one letter.
 */
export const isValidGuestName = (name: string) => /^[\p{L}\p{M}\s.'’-]+$/u.test(name) && /\p{L}/u.test(name);

/** The digits in a phone number, ignoring +, spaces, dashes, brackets and dots */
export const phoneDigitCount = (phone: string) => phone.replace(/\D/g, "").length;

/**
 * An optional leading +, then digits and the usual separators, with 7 to 15
 * digits (E.164 numbers have at most 15). Counting digits rather than
 * characters lets guests type spaces without being cut off.
 */
export const isValidGuestPhone = (phone: string) => {
  const digits = phoneDigitCount(phone);
  return /^\+?[\d\s\-().]+$/.test(phone) && digits >= 7 && digits <= 15;
};
