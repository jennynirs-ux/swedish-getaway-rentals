import MainNavigation from "@/components/MainNavigation";
import { FAQJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import PropertyFooter from "@/components/PropertyFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Star,
  Lightbulb,
  Target,
  BarChart3,
  Percent,
  Globe,
} from "lucide-react";

const PricingGuide = () => {
  const dummyProperty = {
    id: "pricing-guide",
    title: "Nordin Getaways",
    location: "Sweden",
    tagline_line1: "Host Pricing Guide - Maximize Your Revenue",
    footer_quick_links: ["The Nordic Collection", "Contact", "First time in Sweden"],
    get_in_touch_info: {},
  };

  return (
    <div className="min-h-screen flex flex-col">
      <FAQJsonLd items={[
        { question: "What commission does Nordic Getaways charge?", answer: "Nordic Getaways charges a 10% commission on all bookings. This covers payment processing, platform maintenance, customer support, and marketing." },
        { question: "How should I price my Nordic vacation rental?", answer: "Research comparable properties in your area, consider seasonal demand (Midsommar and Northern Lights season are peak), factor in the 10% platform commission, and adjust for weekends and holidays. Prices are set in SEK." },
        { question: "When do I get paid for bookings?", answer: "Payouts are processed within 24 hours of guest check-in. Funds are transferred to your registered bank account via Stripe." },
        { question: "Can I set different prices for different seasons?", answer: "Yes, Nordic Getaways supports dynamic pricing. You can set seasonal rates, weekend premiums, and special holiday pricing through the host dashboard." },
        { question: "What is included in the nightly rate?", answer: "Your nightly rate should cover accommodation, basic utilities, Wi-Fi, and standard amenities. Additional services like cleaning fees, airport transfers, or activity packages can be listed separately." },
      ]} />
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: 'https://nordic-getaways.com' },
        { name: 'Pricing Guide', url: 'https://nordic-getaways.com/pricing-guide' },
      ]} />
      <MainNavigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Pricing Guide for Hosts
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90">
              Master the art of pricing your property for maximum bookings and revenue
            </p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-3xl">
                  <DollarSign className="h-8 w-8 text-primary" />
                  Understanding Pricing Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Setting the right price for your property is both an art and a science. Your pricing strategy can make
                  or break your success as a host. This comprehensive guide will help you understand market dynamics,
                  guest psychology, and strategic pricing techniques to maximize your revenue while maintaining high
                  occupancy rates.
                </p>
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="font-semibold text-primary mb-2">Important: Platform Commission</p>
                  <p className="text-sm text-muted-foreground">
                    Nordin Getaways charges a <strong>10% commission</strong> on all bookings. When you set your price,
                    guests will see the total price including our commission. For example:
                  </p>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Your nightly rate:</span>
                      <span className="font-semibold">2,000 SEK</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Platform commission (10%):</span>
                      <span>+ 200 SEK</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-bold">
                      <span>Guest pays:</span>
                      <span className="text-primary">2,200 SEK/night</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">Market Pricing Tiers in Sweden</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  tier: "Budget",
                  range: "800-1,500 SEK/night",
                  icon: Users,
                  color: "text-blue-600",
                  characteristics: [
                    "Basic amenities",
                    "Shared facilities or simple private",
                    "Rural or less central locations",
                    "Perfect for backpackers and budget travelers",
                  ],
                },
                {
                  tier: "Mid-Range",
                  range: "1,500-3,500 SEK/night",
                  icon: Star,
                  color: "text-amber-600",
                  characteristics: [
                    "Private facilities",
                    "Good location and amenities",
                    "Most popular segment",
                    "Ideal for families and couples",
                  ],
                },
                {
                  tier: "Premium",
                  range: "3,500+ SEK/night",
                  icon: Lightbulb,
                  color: "text-purple-600",
                  characteristics: [
                    "Luxury amenities (sauna, hot tub, etc.)",
                    "Unique or prime locations",
                    "High-end furnishings and design",
                    "Exceptional guest experience",
                  ],
                },
              ].map((tier, index) => {
                const Icon = tier.icon;
                return (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-4">
                        <Badge className={tier.color + " text-white"}>{tier.tier}</Badge>
                        <Icon className={`h-8 w-8 ${tier.color}`} />
                      </div>
                      <CardTitle className="text-2xl">{tier.range}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {tier.characteristics.map((char, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary">•</span>
                            <span>{char}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Factors Affecting Price */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">Key Pricing Factors</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  icon: Users,
                  title: "Number of Bedrooms",
                  content:
                    "Each additional bedroom typically adds 500-1,000 SEK per night. Consider your maximum capacity and whether you offer flexible sleeping arrangements.",
                },
                {
                  icon: Calendar,
                  title: "Seasonality",
                  content:
                    "Summer (June-August) and winter holidays command premium prices. Shoulder seasons (spring/fall) may require 20-30% discounts to maintain bookings.",
                },
                {
                  icon: Target,
                  title: "Location",
                  content:
                    "Proximity to attractions, nature, or cities significantly impacts value. Waterfront, mountain views, or forest settings justify higher rates.",
                },
                {
                  icon: Star,
                  title: "Amenities & Unique Features",
                  content:
                    "Sauna, hot tub, lakefront access, or unique design elements can add 30-50% to your base rate. Highlight what makes you special.",
                },
                {
                  icon: BarChart3,
                  title: "Local Competition",
                  content:
                    "Research similar properties in your area. Price competitively but don't undervalue your unique offerings. Check booking rates, not just listed prices.",
                },
                {
                  icon: TrendingUp,
                  title: "Guest Reviews & Rating",
                  content:
                    "Properties with 4.8+ ratings can charge 10-20% more. Invest in exceptional hospitality—it pays off over time.",
                },
              ].map((factor, index) => {
                const Icon = factor.icon;
                return (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" />
                        {factor.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{factor.content}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Psychology */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-3xl">
                  <Lightbulb className="h-8 w-8 text-primary" />
                  The Psychology of Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Charm Pricing (Ending in 9)</h3>
                  <p className="text-muted-foreground">
                    2,499 SEK feels significantly cheaper than 2,500 SEK, even though it's only 1 SEK difference.
                    This pricing strategy is proven to increase bookings.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Anchor Pricing</h3>
                  <p className="text-muted-foreground">
                    Show your weekend or high-season rates first, so your weekday rates appear as great deals by
                    comparison. This makes guests feel they're getting value.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Round Numbers for Luxury</h3>
                  <p className="text-muted-foreground">
                    Premium properties can use round numbers (3,000 SEK instead of 2,999 SEK) to signal exclusivity
                    and quality. It conveys confidence in your offering.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dynamic Pricing Strategies */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-3xl">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  Dynamic Pricing Strategies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Weekend vs. Weekday Pricing
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Charge 20-40% more for Friday and Saturday nights. Business travelers and weekend getaways have
                    different budget expectations.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Percent className="h-5 w-5 text-primary" />
                    Length-of-Stay Discounts
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Offer 10-15% discount for week-long stays and 20-25% for monthly bookings. Longer stays reduce
                    turnover costs and guarantee occupancy.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Last-Minute and Early-Bird Pricing
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Drop prices 15-25% for bookings within 2 weeks to fill gaps. Conversely, reward early bookers
                    (3+ months ahead) with 5-10% discounts to secure future revenue.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Peak Season Premiums
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    Charge 30-50% more during Midsummer, Christmas, New Year's, and school holidays. Demand is high,
                    so capitalize on it.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Currency & International Guests */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-3xl">
                  <Globe className="h-8 w-8 text-primary" />
                  Currency & International Considerations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  When pricing in SEK, consider that international guests will convert to their home currency. A
                  2,500 SEK/night property equals approximately:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  {[
                    { currency: "EUR", amount: "~220" },
                    { currency: "USD", amount: "~240" },
                    { currency: "GBP", amount: "~190" },
                    { currency: "NOK", amount: "~2,650" },
                  ].map((conv, i) => (
                    <div key={i} className="bg-primary/10 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{conv.amount}</div>
                      <div className="text-sm text-muted-foreground">{conv.currency}</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Prices that appear "round" or attractive in one currency may look awkward in another. Consider
                  adjusting your SEK pricing to align with common price points in major markets.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final Tips */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
                <CardTitle className="text-3xl">Final Tips for Success</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {[
                    "Review and adjust your pricing every 2-4 weeks based on booking trends and competition",
                    "Test different price points during low-demand periods to find your sweet spot",
                    "Don't race to the bottom—focus on value, not just being the cheapest",
                    "Invest in great photos and descriptions to justify premium pricing",
                    "Respond quickly to inquiries and maintain high ratings to command higher rates",
                    "Be transparent about what's included—surprises lead to bad reviews",
                    "Consider offering add-ons (firewood, breakfast baskets, late checkout) for extra revenue",
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                      <span className="text-2xl text-primary leading-none">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <PropertyFooter property={dummyProperty as any} />
    </div>
  );
};

export default PricingGuide;
