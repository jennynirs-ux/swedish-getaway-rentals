// Thin wrapper around the shared financials component, scoped to the host.
import RevenueByChannel from "@/components/financials/RevenueByChannel";

const HostRevenueByChannel = () => <RevenueByChannel scope="host" />;

export default HostRevenueByChannel;
