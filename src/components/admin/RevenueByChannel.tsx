// Thin wrapper around the shared financials component, scoped to admin.
import RevenueByChannel from "@/components/financials/RevenueByChannel";

const AdminRevenueByChannel = () => <RevenueByChannel scope="admin" />;

export default AdminRevenueByChannel;
