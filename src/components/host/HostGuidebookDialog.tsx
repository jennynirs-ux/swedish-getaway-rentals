import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";
import {
  DollarSign,
  Camera,
  FileText,
  Home,
  MessageCircle,
  HelpCircle,
  CheckSquare,
  Info,
  Users,
  Star,
  Lightbulb,
  Calendar,
  Percent,
  TrendingUp,
  Target,
  BarChart3,
  Globe,
  XCircle,
  CheckCircle2,
} from "lucide-react";

/* ---------- Typer ---------- */

type PriceGuideBlock =
  | {
      type: "intro";
      title: string;
      icon?: string;
      body: string;
      commissionExample?: {
        base: string;
        fee: string;
        guest: string;
        note?: string;
      };
    }
  | {
      type: "tiers";
      title: string;
      items: Array<{
        tier: string;
        range: string;
        icon?: string;
        color?: string; // tailwind text-färgklass
        points: string[];
      }>;
    }
  | {
      type: "factors";
      title: string;
      items: Array<{
        icon?: string;
        title: string;
        text: string;
      }>;
    }
  | {
      type: "psychology";
      title: string;
      items: Array<{ title: string; text: string }>;
    }
  | {
      type: "dynamic";
      title: string;
      items: Array<{
        icon?: string;
        title: string;
        text: string;
      }>;
    }
  | {
      type: "currency";
      title: string;
      currencies: Array<{ currency: string; amount: string }>;
      note?: string;
    }
  | {
      type: "final";
      title: string;
      tips: string[];
    };

type SectionContent = {
  title: string;
  description?: string;
  // Price Guide-specifikt
  sections?: PriceGuideBlock[];
  formula?: string;
  example?: string;
  // Övriga flikar
  tips?: string[];
  photoOrder?: string[];
  checklist?: string[];
  examples?: { good: string; bad: string };
  templates?: Record<string, string>;
  faqs?: Array<{ q: string; a: string }>;
  rooms?: Record<string, string[]>;
  final?: string[];
};

type SectionDef = {
  id: string;
  title: string;
  icon: LucideIcon;
  content: SectionContent;
};

interface HostGuidebookDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ---------- Ikon-mappning från sträng → komponent ---------- */
const iconFromName = (name?: string): LucideIcon => {
  switch ((name || "").toLowerCase()) {
    case "dollarsign":
      return DollarSign;
    case "users":
      return Users;
    case "star":
      return Star;
    case "lightbulb":
      return Lightbulb;
    case "calendar":
      return Calendar;
    case "percent":
      return Percent;
    case "trendingup":
      return TrendingUp;
    case "target":
      return Target;
    case "barchart3":
      return BarChart3;
    case "globe":
      return Globe;
    default:
      return Info;
  }
};

/* ---------- Data ---------- */
const sections: SectionDef[] = [
  {
    id: "price-guide",
    title: "Price Guide",
    icon: DollarSign,
    content: {
      title: "Pricing Guide for Hosts",
      description:
        "Master the art of pricing your property for maximum bookings and revenue.",
      sections: [
        {
          type: "intro",
          title: "Understanding Pricing Strategy",
          icon: "DollarSign",
          body:
            "Setting the right price for your property is both an art and a science. Your pricing strategy can make or break your success as a host. This overview helps you understand market dynamics, guest psychology, and pricing techniques.",
          commissionExample: {
            base: "2,000 SEK",
            fee: "200 SEK (10%)",
            guest: "2,200 SEK / night",
            note:
              "Nordic Getaways charges a 10% commission. Guests see the total price including the fee. You receive your base price.",
          },
        },
        {
          type: "tiers",
          title: "Market Pricing Tiers in Sweden",
          items: [
            {
              tier: "Budget",
              range: "800–1,500 SEK / night",
              icon: "Users",
              color: "text-blue-600",
              points: [
                "Basic amenities",
                "Shared or simple private facilities",
                "Rural or less central locations",
                "Good for budget travelers",
              ],
            },
            {
              tier: "Mid-Range",
              range: "1,500–3,500 SEK / night",
              icon: "Star",
              color: "text-amber-600",
              points: [
                "Private facilities",
                "Good location and amenities",
                "Most popular segment",
                "Ideal for families and couples",
              ],
            },
            {
              tier: "Premium",
              range: "3,500+ SEK / night",
              icon: "Lightbulb",
              color: "text-purple-600",
              points: [
                "Luxury amenities (sauna, hot tub, etc.)",
                "Unique or prime locations",
                "High-end furnishings and design",
                "Exceptional guest experience",
              ],
            },
          ],
        },
        {
          type: "factors",
          title: "Key Pricing Factors",
          items: [
            {
              icon: "Users",
              title: "Number of Bedrooms",
              text:
                "Each additional bedroom can add ~500–1,000 SEK per night. Consider total capacity and flexible sleeping.",
            },
            {
              icon: "Calendar",
              title: "Seasonality",
              text:
                "Summer (Jun–Aug) and holidays command premiums. Shoulder seasons may require 20–30% discounts.",
            },
            {
              icon: "Target",
              title: "Location",
              text:
                "Proximity to attractions or nature matters. Waterfront, mountain views, or forest settings justify higher rates.",
            },
            {
              icon: "Star",
              title: "Amenities & Unique Features",
              text:
                "Sauna, hot tub, lake access, or striking design can add 30–50% to your base rate.",
            },
            {
              icon: "BarChart3",
              title: "Local Competition",
              text:
                "Research comparable properties. Look at booking rates, not only list prices.",
            },
            {
              icon: "TrendingUp",
              title: "Guest Reviews & Rating",
              text:
                "4.8+ average ratings can support 10–20% higher pricing. Service quality compounds over time.",
            },
          ],
        },
        {
          type: "psychology",
          title: "The Psychology of Pricing",
          items: [
            {
              title: "Charm Pricing (ending in 9)",
              text:
                "2,499 SEK feels cheaper than 2,500 SEK. This effect often increases conversions.",
            },
            {
              title: "Anchor Pricing",
              text:
                "Show a higher anchor (e.g., weekend/high season) so weekday/low season feels like a deal.",
            },
            {
              title: "Round Numbers for Luxury",
              text:
                "Premium properties can use round numbers to signal confidence and exclusivity.",
            },
          ],
        },
        {
          type: "dynamic",
          title: "Dynamic Pricing Strategies",
          items: [
            {
              icon: "Calendar",
              title: "Weekend vs. Weekday",
              text:
                "Charge 20–40% more for Fri–Sat. Leisure budgets differ from weekday demand.",
            },
            {
              icon: "Percent",
              title: "Length-of-Stay Discounts",
              text:
                "Offer 10–15% for week-long stays, 20–25% for monthly. Longer stays lower turnover cost.",
            },
            {
              icon: "TrendingUp",
              title: "Last-Minute & Early-Bird",
              text:
                "Drop 15–25% within 2 weeks to fill gaps; reward early bookers with 5–10% discounts.",
            },
            {
              icon: "Star",
              title: "Peak Season Premiums",
              text:
                "Charge 30–50% more during Midsummer, Christmas/New Year, and school holidays.",
            },
          ],
        },
        {
          type: "currency",
          title: "Currency & International Guests",
          currencies: [
            { currency: "EUR", amount: "~220" },
            { currency: "USD", amount: "~240" },
            { currency: "GBP", amount: "~190" },
            { currency: "NOK", amount: "~2,650" },
          ],
          note:
            "Prices that look neat in SEK may look awkward in other currencies. Consider common price points in key markets.",
        },
        {
          type: "final",
          title: "Final Tips",
          tips: [
            "Review and adjust pricing every 2–4 weeks",
            "Test price points during low-demand periods",
            "Don’t race to the bottom—focus on value",
            "Great photos & copy justify premium pricing",
            "Respond quickly to inquiries to boost rating",
            "Be transparent about what’s included",
            "Consider add-ons (firewood, breakfast, late checkout)",
          ],
        },
      ],
      formula: "Guest pays: Your price + 10% platform fee",
      example:
        "If you set 1,000 SEK/night, guest sees 1,100 SEK/night; you receive 1,000 SEK.",
    },
  },
  {
    id: "gallery",
    title: "Gallery Guide",
    icon: Camera,
    content: {
      title: "Taking Great Property Photos",
      description: "High-quality photos are crucial for attracting guests.",
      tips: [
        "Shoot during golden hour (morning/evening light)",
        "Clean and declutter all spaces before shooting",
        "Use a wide-angle lens for interior shots",
        "Capture your Hero Image - the most stunning view",
        "Mark your best photo as 'Hero' in the gallery",
        "Show amenities in action (fire in fireplace, set table)",
        "Include exterior and surrounding nature",
        "Take photos from multiple angles",
      ],
      photoOrder: [
        "1. Hero Image (marked in gallery)",
        "2. Exterior/Entrance",
        "3. Living Room",
        "4. Kitchen",
        "5. Bedrooms",
        "6. Bathrooms",
        "7. Outdoor spaces",
        "8. Special amenities (sauna, hot tub, etc.)",
      ],
    },
  },
  {
    id: "basic-info",
    title: "Basic Information",
    icon: FileText,
    content: {
      title: "Writing Strong Listings",
      description: "Your title and description are the first things guests see.",
      tips: [
        "Title: Keep it under 60 characters",
        "Title: Include location and property type",
        "Title: Highlight your unique feature",
        "Description: Start with your best selling point",
        "Description: Use specific details (not just 'cozy')",
        "Description: Mention nearby attractions",
        "Description: Be honest about the space",
        "Description: Include what makes you special",
      ],
      examples: {
        good: "Lakefront Cabin with Private Sauna - Åsunden",
        bad: "Nice House",
      },
    },
  },
  {
    id: "house-prep",
    title: "House Preparation",
    icon: Home,
    content: {
      title: "Preparing Your Home",
      description: "Best practices for getting your property guest-ready.",
      checklist: [
        "Deep clean all areas (see Cleaning Checklist)",
        "Fresh linens and towels provided",
        "Check all appliances work properly",
        "Stock basic amenities (toilet paper, soap, etc.)",
        "Clear instructions for heating, hot water, wifi",
        "Emergency contacts displayed clearly",
        "Remove personal valuables",
        "Ensure adequate lighting in all areas",
        "Test smoke detectors and fire extinguishers",
        "Provide local maps and restaurant recommendations",
      ],
    },
  },
  {
    id: "guest-communication",
    title: "Guest Communication",
    icon: MessageCircle,
    content: {
      title: "Communicating with Guests",
      description: "Tips for excellent guest service.",
      tips: [
        "Respond to inquiries within 2 hours",
        "Send check-in details 24 hours before arrival",
        "Be available during check-in for questions",
        "Check in after first night to ensure everything is okay",
        "Provide clear instructions for everything",
        "Be proactive about potential issues",
        "Ask for feedback during and after stay",
        "Handle complaints professionally and quickly",
      ],
      templates: {
        welcome: "Welcome! Here are your check-in details...",
        checkin: "We hope you arrived safely. Is everything okay?",
        checkout: "Thank you for staying with us! Safe travels!",
      },
    },
  },
  {
    id: "common-problems",
    title: "Common Problems",
    icon: HelpCircle,
    content: {
      title: "FAQ & Solutions",
      description: "Quick solutions to common hosting challenges.",
      faqs: [
        {
          q: "Guest can't find the key lockbox",
          a: "Provide clear photos and detailed directions. Include landmarks. Consider a welcome call.",
        },
        {
          q: "Wifi isn't working",
          a: "Have router location and reset instructions in guidebook. Keep backup hotspot.",
        },
        {
          q: "Heating/hot water issues",
          a: "Provide detailed instructions with photos. Have local handyman on standby.",
        },
        {
          q: "Noise complaints from neighbors",
          a: "Set clear house rules. Remind guests before arrival. Act immediately if issues arise.",
        },
        {
          q: "Guest wants to cancel",
          a: "Review your cancellation policy. Be flexible when possible. Document everything.",
        },
      ],
    },
  },
  {
    id: "cleaning-checklist",
    title: "Cleaning Checklist",
    icon: CheckSquare,
    content: {
      title: "Turnover Cleaning Guide",
      description: "Step-by-step checklist for property turnovers.",
      rooms: {
        Kitchen: [
          "Clean all surfaces and countertops",
          "Clean inside/outside all appliances",
          "Empty and clean refrigerator",
          "Check all dishes are clean and put away",
          "Restock coffee, tea, basic supplies",
          "Take out trash and recycling",
          "Sweep and mop floor",
        ],
        Bathroom: [
          "Scrub toilet, sink, shower/tub",
          "Clean mirrors and fixtures",
          "Restock toilet paper, soap, shampoo",
          "Wash bath mats and replace towels",
          "Empty trash",
          "Check for hair and clean drains",
        ],
        Bedrooms: [
          "Change all linens and pillowcases",
          "Check mattress condition",
          "Dust all surfaces",
          "Vacuum under bed",
          "Clean windows if needed",
          "Check closets are empty",
        ],
        Living: [
          "Vacuum all floors and rugs",
          "Dust all surfaces and decorations",
          "Fluff pillows and arrange furniture",
          "Clean windows and mirrors",
          "Check remote controls work",
          "Arrange magazines and books neatly",
        ],
        Outdoor: [
          "Sweep porch/deck",
          "Clean outdoor furniture",
          "Empty outdoor trash",
          "Check grill is clean (if applicable)",
          "Ensure pathways are clear",
        ],
      },
      final: [
        "Check all lights work",
        "Adjust thermostat",
        "Lock all windows and doors",
        "Take photos for your records",
        "Restock lockbox key",
      ],
    },
  },
];

/* ---------- Komponent ---------- */

const HostGuidebookDialog = ({ isOpen, onClose }: HostGuidebookDialogProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const renderPriceGuideBlocks = (blocks: PriceGuideBlock[]) => {
    return (
      <div className="space-y-8">
        {blocks.map((block, idx) => {
          if (block.type === "intro") {
            const Icon = iconFromName(block.icon);
            return (
              <section key={`intro-${idx}`} className="space-y-4">
                <h4 className="text-xl font-semibold flex items-center gap-2">
                  <Icon className="h-6 w-6 text-primary" />
                  {block.title}
                </h4>
                <p className="text-muted-foreground">{block.body}</p>
                {block.commissionExample && (
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                    <p className="font-semibold text-primary mb-2">Commission Example (10%)</p>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Your nightly rate:</span>
                        <span className="font-semibold">{block.commissionExample.base}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Platform commission:</span>
                        <span>+ {block.commissionExample.fee}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-bold">
                        <span>Guest pays:</span>
                        <span className="text-primary">{block.commissionExample.guest}</span>
                      </div>
                    </div>
                    {block.commissionExample.note && (
                      <p className="text-xs text-muted-foreground mt-2">{block.commissionExample.note}</p>
                    )}
                  </div>
                )}
              </section>
            );
          }

          if (block.type === "tiers") {
            return (
              <section key={`tiers-${idx}`}>
                <h4 className="text-xl font-semibold mb-4">{block.title}</h4>
                <div className="grid md:grid-cols-3 gap-6">
                  {block.items.map((tier, i) => {
                    const Icon = iconFromName(tier.icon);
                    return (
                      <div key={`tier-${i}`} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${tier.color || ""} bg-muted/60`}>
                            {tier.tier}
                          </span>
                          <Icon className={`h-6 w-6 ${tier.color || ""}`} />
                        </div>
                        <div className="text-lg font-semibold mb-2">{tier.range}</div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {tier.points.map((p, j) => (
                            <li key={`point-${j}`} className="flex items-start gap-2">
                              <span className="text-primary leading-5">•</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (block.type === "factors") {
            return (
              <section key={`factors-${idx}`}>
                <h4 className="text-xl font-semibold mb-4">{block.title}</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {block.items.map((item, i) => {
                    const Icon = iconFromName(item.icon);
                    return (
                      <div key={`factor-${i}`} className="border rounded-lg p-4 hover:shadow-sm">
                        <div className="flex items-center gap-2 font-semibold mb-2">
                          <Icon className="h-5 w-5 text-primary" />
                          {item.title}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (block.type === "psychology") {
            return (
              <section key={`psych-${idx}`} className="space-y-3">
                <h4 className="text-xl font-semibold">{block.title}</h4>
                {block.items.map((item, i) => (
                  <div key={`psych-item-${i}`}>
                    <h5 className="font-semibold">{item.title}</h5>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </section>
            );
          }

          if (block.type === "dynamic") {
            return (
              <section key={`dynamic-${idx}`} className="space-y-3">
                <h4 className="text-xl font-semibold">{block.title}</h4>
                {block.items.map((item, i) => {
                  const Icon = iconFromName(item.icon);
                  return (
                    <div key={`dyn-${i}`} className="space-y-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <Icon className="h-5 w-5 text-primary" />
                        {item.title}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.text}</p>
                    </div>
                  );
                })}
              </section>
            );
          }

          if (block.type === "currency") {
            return (
              <section key={`currency-${idx}`} className="space-y-4">
                <h4 className="text-xl font-semibold">{block.title}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {block.currencies.map((c, i) => (
                    <div key={`cur-${i}`} className="bg-primary/10 border border-primary/20 rounded p-3 text-center">
                      <div className="text-xl font-bold text-primary">{c.amount}</div>
                      <div className="text-xs text-muted-foreground">{c.currency}</div>
                    </div>
                  ))}
                </div>
                {block.note && <p className="text-sm text-muted-foreground">{block.note}</p>}
              </section>
            );
          }

          if (block.type === "final") {
            return (
              <section key={`final-${idx}`}>
                <h4 className="text-xl font-semibold mb-3">{block.title}</h4>
                <ul className="space-y-2">
                  {block.tips.map((tip, i) => (
                    <li key={`tip-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          }

          return null;
        })}
      </div>
    );
  };

  const renderSectionContent = (section: SectionDef) => {
    const content = section.content;

    // Special rendering för Price Guide-block
    if (section.id === "price-guide" && Array.isArray(content.sections)) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
            {content.description && <p className="text-muted-foreground">{content.description}</p>}
          </div>

          {renderPriceGuideBlocks(content.sections)}

          {(content.formula || content.example) && (
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-2">Pricing Formula</h4>
              {content.formula && <p className="text-sm font-mono">{content.formula}</p>}
              {content.example && (
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Example:</strong> {content.example}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    // Generisk rendering (övriga flikar)
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">{content.title}</h3>
          {content.description && <p className="text-muted-foreground">{content.description}</p>}
        </div>

        {content.tips && (
          <div>
            <h4 className="font-semibold mb-3">Tips:</h4>
            <ul className="space-y-2">
              {content.tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.photoOrder && (
          <div>
            <h4 className="font-semibold mb-3">Recommended Photo Order:</h4>
            <ol className="space-y-2 list-decimal list-inside text-sm">
              {content.photoOrder.map((item, idx) => (
                <li key={idx} className="text-muted-foreground">
                  {item}
                </li>
              ))}
            </ol>
          </div>
        )}

        {content.checklist && (
          <div>
            <h4 className="font-semibold mb-3">Checklist:</h4>
            <ul className="space-y-2">
              {content.checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.examples && (
          <div>
            <h4 className="font-semibold mb-3">Examples:</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3 bg-green-50 dark:bg-green-950/20 p-3 rounded">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">GOOD:</span>
                  <p className="text-sm mt-1">{content.examples.good}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 p-3 rounded">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-red-700 dark:text-red-400">BAD:</span>
                  <p className="text-sm mt-1">{content.examples.bad}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {content.templates && (
          <div>
            <h4 className="font-semibold mb-3">Message Templates:</h4>
            <div className="space-y-3">
              {Object.entries(content.templates).map(([key, value]) => (
                <div key={key} className="bg-muted/50 p-3 rounded">
                  <span className="text-xs font-semibold uppercase">{key}:</span>
                  <p className="text-sm mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.faqs && (
          <div>
            <h4 className="font-semibold mb-3">Frequently Asked Questions:</h4>
            <div className="space-y-4">
              {content.faqs.map((faq, idx) => (
                <div key={idx} className="border-l-2 border-primary pl-4">
                  <p className="font-medium text-sm mb-1">{faq.q}</p>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.rooms && (
          <div>
            <h4 className="font-semibold mb-3">Room-by-Room Checklist:</h4>
            <div className="space-y-4">
              {Object.entries(content.rooms).map(([room, tasks]) => (
                <div key={room} className="border rounded-lg p-4">
                  <h5 className="font-semibold mb-2">{room}</h5>
                  <ul className="space-y-1">
                    {(tasks as string[]).map((task, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.final && (
          <div>
            <h4 className="font-semibold mb-3">Final Steps:</h4>
            <ul className="space-y-2">
              {content.final.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckSquare className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.formula && (
          <div className="bg-primary/10 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Pricing Formula:</h4>
            <p className="text-sm font-mono">{content.formula}</p>
            {content.example && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Example:</strong> {content.example}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <div className="flex-1 flex m-0 h-full">
          <TooltipProvider>
            <nav className="w-28 border-r border-muted/20 bg-card/50 flex flex-col items-center py-6 gap-6 overflow-y-auto h-full">
              {sections.map((section, index) => {
                const isActive = activeIndex === index;
                const Icon = section.icon;
                return (
                  <Tooltip key={section.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setActiveIndex(index)}
                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                          isActive
                            ? "bg-primary text-white scale-110"
                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                        }`}
                        aria-label={section.title}
                      >
                        <Icon className="h-6 w-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{section.title}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </TooltipProvider>

          <div className="flex-1 overflow-y-auto px-8 py-6 relative h-full">
            <DialogHeader className="mb-6">
              <div className="flex items-start justify-between">
                <DialogTitle className="text-3xl font-bold">
                  {sections[activeIndex].title}
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="prose prose-sm max-w-none">
              {renderSectionContent(sections[activeIndex])}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostGuidebookDialog;
