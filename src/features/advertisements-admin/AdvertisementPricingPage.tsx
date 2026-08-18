import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAdvertisementPricing, listAdvertisementPricing, updateAdvertisementPricing } from "./api";
import { useToast } from "../../context/ToastContext";
import { PermissionGate } from "../../components/PermissionGate";

export function AdvertisementPricingPage() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-ad-pricing"],
    queryFn: listAdvertisementPricing
  });
  const [typeCode, setTypeCode] = useState("IMAGE_BANNER");
  const [durationDays, setDurationDays] = useState(15);
  const [priceInr, setPriceInr] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createAdvertisementPricing({
        typeCode,
        durationDays,
        pricePaise: Math.round(Number(priceInr) * 100)
      }),
    onSuccess: () => {
      addToast("Pricing created.", "success");
      setPriceInr("");
      void qc.invalidateQueries({ queryKey: ["admin-ad-pricing"] });
    },
    onError: (e: Error) => addToast(e.message, "error")
  });

  return (
    <div className="space-y-6">
      <Link to="/advertisements" className="text-sm text-primary">
        ← Advertisements
      </Link>
      <h2 className="text-xl font-semibold">Advertisement pricing</h2>
      <p className="text-sm text-slate-600">
        Changing a price does not alter already-paid campaigns. Existing purchases keep their snapshot.
      </p>

      <PermissionGate action="advertisements.pricing">
        <form
          className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={typeCode}
            onChange={(e) => setTypeCode(e.target.value)}
          >
            {(data?.types || []).map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            className="rounded-lg border px-3 py-2 text-sm"
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            placeholder="Duration days"
          />
          <input
            type="number"
            min={1}
            step="0.01"
            className="rounded-lg border px-3 py-2 text-sm"
            value={priceInr}
            onChange={(e) => setPriceInr(e.target.value)}
            placeholder="Price ₹"
          />
          <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-white">
            Add duration
          </button>
        </form>
      </PermissionGate>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Duration</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Version</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Refund on reject</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.pricing || []).map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.typeCode}</td>
                <td className="px-3 py-2">{row.durationDays} days</td>
                <td className="px-3 py-2">₹{row.priceInr.toLocaleString("en-IN")}</td>
                <td className="px-3 py-2">v{row.version}</td>
                <td className="px-3 py-2">{row.isActive ? "Yes" : "No"}</td>
                <td className="px-3 py-2">{row.refundOnReject ? "Yes" : "No"}</td>
                <td className="px-3 py-2">{new Date(row.updatedAt).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <PermissionGate action="advertisements.pricing">
                    <button
                      type="button"
                      className="text-xs text-primary"
                      onClick={async () => {
                        const next = window.prompt("New price in ₹", String(row.priceInr));
                        if (!next) return;
                        const paise = Math.round(Number(next) * 100);
                        try {
                          await updateAdvertisementPricing(row.id, {
                            pricePaise: paise,
                            reason: "Admin price update"
                          });
                          addToast("Price updated for future purchases.", "success");
                          void qc.invalidateQueries({ queryKey: ["admin-ad-pricing"] });
                        } catch (e) {
                          addToast(e instanceof Error ? e.message : "Failed", "error");
                        }
                      }}
                    >
                      Edit price
                    </button>
                    <button
                      type="button"
                      className="ml-2 text-xs text-slate-600"
                      onClick={async () => {
                        await updateAdvertisementPricing(row.id, { isActive: !row.isActive });
                        void qc.invalidateQueries({ queryKey: ["admin-ad-pricing"] });
                      }}
                    >
                      {row.isActive ? "Disable" : "Enable"}
                    </button>
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
