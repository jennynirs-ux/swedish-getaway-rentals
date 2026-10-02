import { Link } from "react-router-dom";
import { COMPANY, COMPANY_ADDRESS } from "@/content/company";

// Company details and legal links for the bottom of every footer
const CompanyLine = ({ className = "" }: { className?: string }) => (
  <p className={`text-sm leading-relaxed ${className}`}>
    © {new Date().getFullYear()} Nordic Getaways · {COMPANY.name}, org. no. {COMPANY.orgNumber} · {COMPANY_ADDRESS}
    <br />
    <Link to="/privacy" className="underline hover:no-underline">Privacy policy</Link>
    {" · "}
    <Link to="/terms" className="underline hover:no-underline">Booking terms</Link>
    {" · "}
    <a href={`mailto:${COMPANY.email}`} className="underline hover:no-underline">{COMPANY.email}</a>
  </p>
);

export default CompanyLine;
