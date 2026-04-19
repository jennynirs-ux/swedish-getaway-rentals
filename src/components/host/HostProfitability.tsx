// Thin wrapper around the shared financials component, scoped to the host.
import Profitability from "@/components/financials/Profitability";

const HostProfitability = () => <Profitability scope="host" showMarginCard />;

export default HostProfitability;
