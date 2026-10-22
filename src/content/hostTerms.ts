// The host terms on /host-terms (src/pages/HostTerms.tsx). Hosts accept them
// before they can publish: accept_host_terms(_version) stores the version and
// the time on their profile, and the prevent_self_publish trigger refuses to
// publish without an acceptance (of any version). When the text changes in a
// way hosts must accept again, set a new version (the date of the change); the
// date on the page follows, and the app must compare it with
// profiles.host_terms_version to ask again.

export const HOST_TERMS_VERSION = "2026-10-22";

export const HOST_TERMS_PATH = "/host-terms";

/** "2026-10-21" → "21 October 2026", the date shown at the top of the page */
export const hostTermsDate = (version: string = HOST_TERMS_VERSION) =>
  new Date(`${version}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export const HOST_TERMS_UPDATED = hostTermsDate();
