// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseRecord,
  type ExpenseCategory,
  type CreateExpenseData,
} from "@/services/expenseService";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "cleaning", label: "Cleaning" },
  { value: "maintenance", label: "Maintenance" },
  { value: "supplies", label: "Supplies" },
  { value: "utilities", label: "Utilities" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

const categoryColors: Record<string, string> = {
  cleaning: "bg-blue-100 text-blue-800",
  maintenance: "bg-orange-100 text-orange-800",
  supplies: "bg-purple-100 text-purple-800",
  utilities: "bg-yellow-100 text-yellow-800",
  insurance: "bg-green-100 text-green-800",
  other: "bg-gray-100 text-gray-800",
};

interface Property {
  id: string;
  title: string;
}

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Form state
  const [form, setForm] = useState<CreateExpenseData>({
    property_id: "",
    category: "cleaning",
    description: "",
    amount: 0,
    expense_date: new Date().toISOString().split("T")[0],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expenseData, { data: propertyData }] = await Promise.all([
        getExpenses({
          propertyId: filterProperty !== "all" ? filterProperty : undefined,
          category: filterCategory !== "all" ? (filterCategory as ExpenseCategory) : undefined,
        }),
        supabase.from("properties").select("id, title").eq("active", true).order("title"),
      ]);
      setExpenses(expenseData);
      setProperties(propertyData || []);
    } catch (error) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [filterProperty, filterCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    if (!form.property_id || form.amount <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingId) {
        await updateExpense(editingId, form);
        toast.success("Expense updated");
      } else {
        await createExpense(form);
        toast.success("Expense added");
      }
      setDialogOpen(false);
      setEditingId(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(editingId ? "Failed to update expense" : "Failed to add expense");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      toast.success("Expense deleted");
      loadData();
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const handleEdit = (expense: ExpenseRecord) => {
    setEditingId(expense.id);
    setForm({
      property_id: expense.property_id,
      category: expense.category,
      description: expense.description || "",
      amount: expense.amount,
      expense_date: expense.expense_date,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setForm({
      property_id: properties[0]?.id || "",
      category: "cleaning",
      description: "",
      amount: 0,
      expense_date: new Date().toISOString().split("T")[0],
    });
  };

  const exportCSV = () => {
    const header = "Date,Property,Category,Description,Amount (SEK)\n";
    const rows = expenses.map((e) => {
      const prop = properties.find((p) => p.id === e.property_id);
      return `${e.expense_date},"${prop?.title || ""}",${e.category},"${e.description || ""}",${(e.amount / 100).toFixed(2)}`;
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Expenses</h3>
          <p className="text-sm text-muted-foreground">
            Total: {(totalExpenses / 100).toLocaleString("sv-SE")} SEK ({expenses.length} entries)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={expenses.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) { setEditingId(null); resetForm(); }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Expense" : "Add Expense"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Property *</Label>
                  <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                </div>
                <div>
                  <Label>Amount (SEK) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.amount / 100 || ""}
                    onChange={(e) => setForm({ ...form, amount: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={form.description || ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g., Window repair, cleaning supplies..."
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingId ? "Update Expense" : "Add Expense"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All properties" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No expenses found. Click "Add Expense" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => {
                  const prop = properties.find((p) => p.id === expense.property_id);
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="text-sm">{expense.expense_date}</TableCell>
                      <TableCell className="text-sm font-medium">{prop?.title || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={categoryColors[expense.category]}>
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {expense.description || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(expense.amount / 100).toLocaleString("sv-SE")} kr
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseManagement;
