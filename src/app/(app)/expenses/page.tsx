import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getExpenses } from "@/lib/queries/expenses";
import { getBookingsForExpenseSelector } from "@/lib/queries/expenses";
import { computeExpenseSummary } from "@/lib/utils/expenses";
import { ExpensesShell } from "./expenses-shell";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [expenses, bookings, photographerResult] = await Promise.all([
    getExpenses(),
    getBookingsForExpenseSelector(),
    supabase.from("photographers").select("default_currency").eq("id", user.id).single(),
  ]);

  const defaultCurrency =
    (photographerResult.data as { default_currency: string } | null)?.default_currency ?? "EUR";

  const summary = computeExpenseSummary(expenses);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-2xl font-bold mb-6">Expenses</h1>
      <ExpensesShell
        initialExpenses={expenses}
        bookings={bookings}
        summary={summary}
        defaultCurrency={defaultCurrency}
      />
    </div>
  );
}
