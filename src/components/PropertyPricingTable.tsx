import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PricingData {
  off_season: { price: number; currency: string };
  peak_season: { price: number; currency: string };
  holiday_periods: { price: number; currency: string };
  cleaning_fee: { price: number; currency: string };
  minimum_stay: number;
  weekly_discount: string;
}

interface PropertyPricingTableProps {
  pricingData: PricingData;
}

const PropertyPricingTable = ({ pricingData }: PropertyPricingTableProps) => {
  const formatPrice = (price: number, currency: string) => {
    return `${price.toLocaleString()} ${currency}`;
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Pricing Information</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Off Season</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(pricingData.off_season.price, pricingData.off_season.currency)}
                </p>
                <p className="text-sm text-muted-foreground">per night</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Peak Season</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(pricingData.peak_season.price, pricingData.peak_season.currency)}
                </p>
                <p className="text-sm text-muted-foreground">per night</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Holiday Periods</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(pricingData.holiday_periods.price, pricingData.holiday_periods.currency)}
                </p>
                <p className="text-sm text-muted-foreground">per night</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Cleaning Fee</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold">
                  {formatPrice(pricingData.cleaning_fee.price, pricingData.cleaning_fee.currency)}
                </p>
                <p className="text-sm text-muted-foreground">one-time fee</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Minimum Stay</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold">{pricingData.minimum_stay}</p>
                <p className="text-sm text-muted-foreground">nights</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-center">Weekly Discount</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-lg font-semibold">{pricingData.weekly_discount}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropertyPricingTable;