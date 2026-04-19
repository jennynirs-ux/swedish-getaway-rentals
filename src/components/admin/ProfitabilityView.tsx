// Thin wrapper around the shared financials component, scoped to admin.
import Profitability from "@/components/financials/Profitability";

const ProfitabilityView = () => <Profitability scope="admin" showMarginCard={false} />;

export default ProfitabilityView;
