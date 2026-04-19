// Thin wrapper around the shared financials component, scoped to admin.
import Expenses from "@/components/financials/Expenses";

const ExpenseManagement = () => <Expenses scope="admin" showSummary={false} />;

export default ExpenseManagement;
