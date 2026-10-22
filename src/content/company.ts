// The company behind nordic-getaways.com, shown in the footers, on the
// contact page and in the privacy policy and booking terms.
export const COMPANY = {
  name: "Mojjo AB",
  orgNumber: "559477-3912",
  street: "Häckenvägen 78",
  postcode: "443 92",
  city: "Lerum",
  country: "Sweden",
  email: "support@mojjo.se",
} as const;

export const COMPANY_ADDRESS = `${COMPANY.street}, ${COMPANY.postcode} ${COMPANY.city}, ${COMPANY.country}`;

/** Dates shown at the top of the booking terms and the privacy policy; bump only the one whose text changed */
export const TERMS_UPDATED = "22 October 2026";
export const PRIVACY_UPDATED = "22 October 2026";
