"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type TripExpense = {
  id: string;
  category: string;
  amount: number;
  currency: string;
  note: string | null;
  spentAt: string | Date;
};

export default function TripExpenses({
  tripId,
  expenses,
}: {
  tripId: string;
  expenses: TripExpense[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const e of expenses) {
      byCurrency.set(e.currency, (byCurrency.get(e.currency) ?? 0) + e.amount);
    }
    return Array.from(byCurrency.entries());
  }, [expenses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount, currency, note }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add expense");
        return;
      }

      setCategory("");
      setAmount("");
      setNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {totals.length > 0 && (
        <div className="flex gap-4 text-sm font-medium">
          {totals.map(([cur, total]) => (
            <span key={cur}>
              {total.toFixed(2)} {cur}
            </span>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          className="w-32 rounded border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-28 rounded border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <input
          className="w-20 rounded border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
          placeholder="USD"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          maxLength={10}
        />
        <input
          className="flex-1 min-w-32 rounded border border-black/10 px-3 py-1.5 text-sm dark:border-white/20"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {expenses.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          No expenses logged yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/20"
            >
              <div>
                <span className="font-medium">{expense.category}</span>{" "}
                <span className="text-black/60 dark:text-white/60">
                  {expense.amount.toFixed(2)} {expense.currency}
                  {expense.note ? ` · ${expense.note}` : ""}
                </span>
              </div>
              <button
                onClick={() => handleDelete(expense.id)}
                className="text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
