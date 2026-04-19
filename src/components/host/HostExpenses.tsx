// Thin wrapper around the shared financials component, scoped to the host.
// Kept for backwards compatibility with existing imports.
import Expenses from "@/components/financials/Expenses";

const HostExpenses = () => <Expenses scope="host" showSummary />;

export default HostExpenses;
