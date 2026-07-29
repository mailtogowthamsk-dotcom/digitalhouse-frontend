import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listSubscriptionPlans,
  updateSubscriptionPlans,
  type SubscriptionPlanCatalogItem
} from "../../api/platformAdmin";
import { useToast } from "../../context/ToastContext";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const btnPrimary =
  "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
const btnGhost =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

type PlanDraft = SubscriptionPlanCatalogItem;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function SubscriptionPricingPanel() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [plans, setPlans] = useState<PlanDraft[]>([]);
  const [gstPercent, setGstPercent] = useState(0);
  const [monthlyOpenQuota, setMonthlyOpenQuota] = useState(10);
  const [contactRevealPaise, setContactRevealPaise] = useState(50000);
  const [durationMonths, setDurationMonths] = useState(6);

  const q = useQuery({
    queryKey: ["platform-subscription-plans"],
    queryFn: listSubscriptionPlans,
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (!q.data) return;
    setPlans(q.data.planCatalog ?? []);
    setGstPercent(q.data.platformSettings?.gstPercent ?? 0);
    setMonthlyOpenQuota(q.data.platformSettings?.monthlyOpenQuota ?? 10);
    setContactRevealPaise(q.data.platformSettings?.contactRevealPaise ?? 50000);
    setDurationMonths(q.data.platformSettings?.durationMonths ?? 6);
  }, [q.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      updateSubscriptionPlans({
        gstPercent,
        monthlyOpenQuota,
        contactRevealPaise,
        durationMonths,
        goldPriceInr: plans.find((p) => p.plan === "GOLD")?.priceInr,
        platinumPriceInr: plans.find((p) => p.plan === "PLATINUM")?.priceInr,
        plans: plans.map((p) => ({
          plan: p.plan,
          label: p.label,
          tagline: p.tagline,
          priceInr: p.priceInr,
          durationMonths: p.durationMonths,
          opensPerMonth: p.opensPerMonth,
          benefits: p.benefits,
          gstPercent: p.gstPercent,
          displayOrder: p.displayOrder,
          isActive: p.isActive,
          popular: p.popular,
          canOpenOneStar: p.canOpenOneStar,
          canOpenTwoStar: p.canOpenTwoStar,
          whoViewedMe: p.whoViewedMe
        }))
      }),
    onSuccess: (res) => {
      addToast(res.message || "Subscription pricing saved", "success");
      void queryClient.invalidateQueries({ queryKey: ["platform-subscription-plans"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-business-settings"] });
    },
    onError: (e) => addToast(e instanceof Error ? e.message : "Save failed", "error")
  });

  const updatePlan = (plan: PlanDraft["plan"], patch: Partial<PlanDraft>) => {
    setPlans((rows) => rows.map((r) => (r.plan === plan ? { ...r, ...patch } : r)));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">Subscription pricing</h3>
        <p className="mt-1 text-sm text-slate-600">
          Configure plan price, duration, benefits, GST, display order, active state, and popular
          badge. Purchases and revenue stay in Subscriptions & Revenue.
        </p>
        <div className="mt-3">
          <Link to="/matrimony-subscriptions" className={btnGhost}>
            Open Subscriptions & Revenue
          </Link>
        </div>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-slate-500">Loading plans…</p>
      ) : q.isError ? (
        <p className="text-sm text-red-600">{(q.error as Error).message}</p>
      ) : (
        <>
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Global GST %">
              <input
                className={inputClass}
                type="number"
                min={0}
                max={100}
                value={gstPercent}
                onChange={(e) => setGstPercent(Number(e.target.value))}
              />
            </Field>
            <Field label="Duration (months)">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
              />
            </Field>
            <Field label="Monthly open quota">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={monthlyOpenQuota}
                onChange={(e) => setMonthlyOpenQuota(Number(e.target.value))}
              />
            </Field>
            <Field label="Contact reveal (paise)">
              <input
                className={inputClass}
                type="number"
                min={0}
                value={contactRevealPaise}
                onChange={(e) => setContactRevealPaise(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="space-y-4">
            {plans.map((p) => (
              <div key={p.plan} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-800">
                    {p.plan} · {p.label}
                  </h4>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={p.isActive}
                        onChange={(e) => updatePlan(p.plan, { isActive: e.target.checked })}
                      />
                      Active
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={p.popular}
                        onChange={(e) => updatePlan(p.plan, { popular: e.target.checked })}
                      />
                      Popular badge
                    </label>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Label">
                    <input
                      className={inputClass}
                      value={p.label}
                      onChange={(e) => updatePlan(p.plan, { label: e.target.value })}
                    />
                  </Field>
                  <Field label="Price (INR)">
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={p.priceInr}
                      onChange={(e) => updatePlan(p.plan, { priceInr: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Duration (months)">
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={p.durationMonths}
                      onChange={(e) =>
                        updatePlan(p.plan, { durationMonths: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Opens / month">
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={p.opensPerMonth}
                      onChange={(e) =>
                        updatePlan(p.plan, { opensPerMonth: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="GST %">
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      max={100}
                      value={p.gstPercent}
                      onChange={(e) => updatePlan(p.plan, { gstPercent: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Display order">
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={p.displayOrder}
                      onChange={(e) =>
                        updatePlan(p.plan, { displayOrder: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Tagline">
                    <input
                      className={inputClass}
                      value={p.tagline}
                      onChange={(e) => updatePlan(p.plan, { tagline: e.target.value })}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Benefits (one per line)">
                      <textarea
                        className={`${inputClass} min-h-[88px]`}
                        value={(p.benefits || []).join("\n")}
                        onChange={(e) =>
                          updatePlan(p.plan, {
                            benefits: e.target.value
                              .split("\n")
                              .map((l) => l.trim())
                              .filter(Boolean)
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={btnPrimary}
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? "Saving…" : "Save subscription pricing"}
          </button>
        </>
      )}
    </div>
  );
}
