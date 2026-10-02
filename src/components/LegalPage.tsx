import type { ReactNode } from "react";
import MainNavigation from "@/components/MainNavigation";
import PropertyFooter from "@/components/PropertyFooter";
import { LEGAL_UPDATED } from "@/content/company";

const FOOTER_PROPERTY = {
  id: "legal",
  title: "Nordic Getaways",
  location: "Lerum, Sweden",
  tagline_line1: "Lakeside stays on Stora Härsjön",
  footer_quick_links: ["Contact", "First time in Sweden?"],
  get_in_touch_info: {},
};

// Shared layout for the privacy policy and booking terms
const LegalPage = ({ title, lead, children }: { title: string; lead: string; children: ReactNode }) => (
  <div className="min-h-screen flex flex-col">
    <MainNavigation />

    <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
        <p className="text-lg text-primary-foreground/90">{lead}</p>
        <p className="text-sm text-primary-foreground/80 mt-4">Last updated {LEGAL_UPDATED}</p>
      </div>
    </section>

    <main className="flex-1 py-12 bg-background">
      <article className="container mx-auto px-4 max-w-3xl space-y-10 text-foreground leading-relaxed [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-primary [&_a]:underline">
        {children}
      </article>
    </main>

    <PropertyFooter property={FOOTER_PROPERTY as never} />
  </div>
);

export default LegalPage;
