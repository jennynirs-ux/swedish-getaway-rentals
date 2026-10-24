import { Link } from "@/i18n/router";
import { COMPANY } from "@/content/company";
import { type Copy, useCopy } from "@/i18n";

const en = {
  orgNo: "org. no.",
  country: COMPANY.country as string,
  privacy: "Privacy policy",
  terms: "Booking terms",
};
const COPY: Copy<typeof en> = {
  en,
  sv: { orgNo: "org.nr", country: "Sverige", privacy: "Integritetspolicy", terms: "Bokningsvillkor" },
  de: { orgNo: "Org.-Nr.", country: "Schweden", privacy: "Datenschutzerklärung", terms: "AGB" },
};

// Company details and legal links for the bottom of every footer
const CompanyLine = ({ className = "" }: { className?: string }) => {
  const t = useCopy(COPY);
  // COMPANY_ADDRESS, with the country in the page's language
  const address = `${COMPANY.street}, ${COMPANY.postcode} ${COMPANY.city}, ${t.country}`;
  return (
    <p className={`text-sm leading-relaxed ${className}`}>
      © {new Date().getFullYear()} Nordic Getaways · {COMPANY.name}, {t.orgNo} {COMPANY.orgNumber} · {address}
      <br />
      <Link to="/privacy" className="underline hover:no-underline">{t.privacy}</Link>
      {" · "}
      <Link to="/terms" className="underline hover:no-underline">{t.terms}</Link>
      {" · "}
      <a href={`mailto:${COMPANY.email}`} className="underline hover:no-underline">{COMPANY.email}</a>
    </p>
  );
};

export default CompanyLine;
