"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type BudgetItemData = {
  id: string;
  category: string;
  label: string;
  amount: number;
};

const BUDGET_CATEGORIES = [
  "flight",
  "hotel",
  "food",
  "transport",
  "activities",
  "shopping",
  "other",
] as const;

const CATEGORY_META: Record<
  (typeof BUDGET_CATEGORIES)[number],
  { label: string; icon: string }
> = {
  flight: { label: "Flights", icon: "✈️" },
  hotel: { label: "Hotels", icon: "🏨" },
  food: { label: "Food", icon: "🍽️" },
  transport: { label: "Transport", icon: "🚌" },
  activities: { label: "Activities", icon: "🎟️" },
  shopping: { label: "Shopping", icon: "🛍️" },
  other: { label: "Other", icon: "🧾" },
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function TripBudget({
  tripId,
  items,
  budgetTarget,
  budgetCurrency,
}: {
  tripId: string;
  items: BudgetItemData[];
  budgetTarget: number | null;
  budgetCurrency: string;
}) {
  const router = useRouter();
  const [category, setCategory] =
    useState<(typeof BUDGET_CATEGORIES)[number]>("flight");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(
    budgetTarget != null ? String(budgetTarget) : "",
  );
  const [targetSubmitting, setTargetSubmitting] = useState(false);
  const [targetError, setTargetError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, label, amount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to add");
        return;
      }
      setLabel("");
      setAmount("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/budget/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTargetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTargetError(null);
    setTargetSubmitting(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetTarget: targetInput ? Number(targetInput) : null,
          budgetCurrency,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTargetError(data.error ?? "Failed to save");
        return;
      }
      setEditingTarget(false);
      router.refresh();
    } finally {
      setTargetSubmitting(false);
    }
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const remaining = budgetTarget != null ? budgetTarget - total : null;

  const grouped = BUDGET_CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((item) => item.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-black/10 p-3 dark:border-white/20">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs text-black/50 dark:text-white/50">
              Total spent
            </div>
            <div className="text-lg font-semibold">
              {formatMoney(total, budgetCurrency)}
            </div>
          </div>
          {budgetTarget != null && remaining != null && (
            <div className="text-right">
              <div className="text-xs text-black/50 dark:text-white/50">
                {remaining >= 0 ? "Remaining" : "Over budget"}
              </div>
              <div
                className={`text-lg font-semibold ${
                  remaining >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatMoney(Math.abs(remaining), budgetCurrency)}
              </div>
            </div>
          )}
        </div>

        {editingTarget ? (
          <form
            onSubmit={handleTargetSubmit}
            className="mt-2 flex items-center gap-2"
          >
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full min-w-0 rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
              placeholder={`Budget target (${budgetCurrency})`}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={targetSubmitting}
              className="shrink-0 rounded-lg bg-foreground px-2 py-1.5 text-xs text-background disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetInput(budgetTarget != null ? String(budgetTarget) : "");
                setEditingTarget(false);
              }}
              className="shrink-0 text-xs text-black/50 dark:text-white/50"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setEditingTarget(true)}
            className="mt-2 text-xs underline"
          >
            {budgetTarget != null ? "Edit budget target" : "Set a budget target"}
          </button>
        )}
        {targetError && (
          <p className="mt-1 text-xs text-red-600">{targetError}</p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-xl border border-black/10 p-3 dark:border-white/20"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as (typeof BUDGET_CATEGORIES)[number])
            }
            className="w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-transparent sm:w-auto"
          >
            {BUDGET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}
              </option>
            ))}
          </select>
          <input
            className="w-full min-w-0 rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20 sm:flex-1"
            placeholder="Label (e.g. Flight to Tokyo)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        <input
          type="number"
          step="0.01"
          min="0"
          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/20"
          placeholder={`Amount (${budgetCurrency})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-xl bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add"}
        </button>
      </form>

      {grouped.length > 0 ? (
        <div className="flex flex-col gap-3">
          {grouped.map(({ category: cat, items: catItems }) => {
            const subtotal = catItems.reduce((sum, item) => sum + item.amount, 0);
            return (
              <div key={cat}>
                <div className="mb-1 flex items-center justify-between text-xs text-black/50 dark:text-white/50">
                  <span>
                    {CATEGORY_META[cat].icon} {CATEGORY_META[cat].label}
                  </span>
                  <span>{formatMoney(subtotal, budgetCurrency)}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {catItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/20"
                    >
                      <span>{item.label}</span>
                      <div className="flex shrink-0 items-center gap-3">
                        <span>{formatMoney(item.amount, budgetCurrency)}</span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="text-red-600 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">
          Add flights, hotels, food, and other costs to track what this trip
          costs.
        </p>
      )}
    </div>
  );
}
