import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { createAdminAdvertisement, publishAdminAdvertisement } from "./api";
import { useToast } from "../../context/ToastContext";
import { PermissionGate } from "../../components/PermissionGate";

const CTA_TYPES = [
  { code: "CALL", label: "Call Now" },
  { code: "WHATSAPP", label: "WhatsApp" },
  { code: "WEBSITE", label: "Visit Website" },
  { code: "EMAIL", label: "Email" },
  { code: "DIRECTIONS", label: "Get Directions" },
  { code: "CUSTOM_URL", label: "Custom" }
];

const CATEGORIES = [
  "RETAIL",
  "SERVICES",
  "FOOD",
  "EDUCATION",
  "HEALTH",
  "REAL_ESTATE",
  "JOBS",
  "EVENTS",
  "VEHICLES",
  "OTHER"
];

const TYPES = ["IMAGE_BANNER", "VIDEO", "PROMOTIONAL_CARD", "SPONSORED_CONTENT"];

export function AdvertisementCreatePage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    userId: "",
    typeCode: "IMAGE_BANNER",
    businessName: "",
    businessCategory: "RETAIL",
    title: "",
    shortDescription: "",
    description: "",
    contactPhone: "",
    whatsappNumber: "",
    contactEmail: "",
    websiteUrl: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    ctaType: "CALL",
    ctaLabel: "Call Now",
    mediaFileId: "",
    scheduledStartAt: "",
    scheduledEndAt: ""
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const body = () => ({
    userId: Number(form.userId),
    typeCode: form.typeCode,
    businessName: form.businessName,
    businessCategory: form.businessCategory,
    title: form.title,
    shortDescription: form.shortDescription || null,
    description: form.description,
    contactPhone: form.contactPhone || null,
    whatsappNumber: form.whatsappNumber || null,
    contactEmail: form.contactEmail || null,
    websiteUrl: form.websiteUrl || null,
    address: form.address || null,
    city: form.city || null,
    district: form.district || null,
    state: form.state || null,
    pincode: form.pincode || null,
    ctaType: form.ctaType,
    ctaLabel: form.ctaLabel,
    mediaFileId: form.mediaFileId ? Number(form.mediaFileId) : null,
    scheduledStartAt: form.scheduledStartAt ? new Date(form.scheduledStartAt).toISOString() : null,
    scheduledEndAt: form.scheduledEndAt ? new Date(form.scheduledEndAt).toISOString() : null,
    billingMode: "complimentary"
  });

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      const created = await createAdminAdvertisement(body());
      const ad = (created.advertisement || created) as { id?: number };
      const id = Number(ad.id);
      if (publish && Number.isFinite(id)) {
        await publishAdminAdvertisement(id, {
          scheduledStartAt: form.scheduledStartAt ? new Date(form.scheduledStartAt).toISOString() : null,
          scheduledEndAt: form.scheduledEndAt ? new Date(form.scheduledEndAt).toISOString() : null
        });
      }
      return { id, publish };
    },
    onSuccess: (res) => {
      addToast(res.publish ? "Advertisement published." : "Draft saved.", "success");
      if (res.id) navigate(`/advertisements/${res.id}`);
    },
    onError: (e: Error) => addToast(e.message, "error")
  });

  return (
    <div className="space-y-4">
      <Link to="/advertisements" className="text-sm text-primary">
        ← Back to advertisements
      </Link>
      <h2 className="text-xl font-semibold">Create advertisement</h2>
      <p className="text-sm text-slate-500">
        Complimentary campaigns skip Razorpay. Paid user campaigns still use the mobile checkout flow.
        Media must already exist as an advertisements media file ID.
      </p>
      <form
        className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(false);
        }}
      >
        <Field label="Advertiser user ID" value={form.userId} onChange={(v) => set("userId", v)} required />
        <label className="text-sm">
          Type
          <select className="mt-1 w-full rounded-lg border px-3 py-2" value={form.typeCode} onChange={(e) => set("typeCode", e.target.value)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <Field label="Business name" value={form.businessName} onChange={(v) => set("businessName", v)} required />
        <label className="text-sm">
          Category
          <select className="mt-1 w-full rounded-lg border px-3 py-2" value={form.businessCategory} onChange={(e) => set("businessCategory", e.target.value)}>
            {CATEGORIES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <Field label="Title" value={form.title} onChange={(v) => set("title", v)} required />
        <Field label="Short description" value={form.shortDescription} onChange={(v) => set("shortDescription", v)} />
        <label className="sm:col-span-2 text-sm">
          Detailed description
          <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <Field label="Phone" value={form.contactPhone} onChange={(v) => set("contactPhone", v)} />
        <Field label="WhatsApp" value={form.whatsappNumber} onChange={(v) => set("whatsappNumber", v)} />
        <Field label="Email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} />
        <Field label="Website" value={form.websiteUrl} onChange={(v) => set("websiteUrl", v)} />
        <Field label="Address" value={form.address} onChange={(v) => set("address", v)} />
        <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
        <Field label="District" value={form.district} onChange={(v) => set("district", v)} />
        <Field label="State" value={form.state} onChange={(v) => set("state", v)} />
        <Field label="Pincode" value={form.pincode} onChange={(v) => set("pincode", v)} />
        <label className="text-sm">
          CTA
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={form.ctaType}
            onChange={(e) => {
              const next = e.target.value;
              set("ctaType", next);
              const found = CTA_TYPES.find((c) => c.code === next);
              if (found) set("ctaLabel", found.label);
            }}
          >
            {CTA_TYPES.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <Field label="CTA label" value={form.ctaLabel} onChange={(v) => set("ctaLabel", v)} />
        <Field label="Media file ID" value={form.mediaFileId} onChange={(v) => set("mediaFileId", v)} />
        <Field label="Start" value={form.scheduledStartAt} onChange={(v) => set("scheduledStartAt", v)} type="datetime-local" />
        <Field label="End" value={form.scheduledEndAt} onChange={(v) => set("scheduledEndAt", v)} type="datetime-local" />
        <div className="sm:col-span-2 flex gap-2">
          <button type="submit" className="rounded-lg border px-3 py-1.5 text-sm" disabled={save.isPending}>
            Save draft
          </button>
          <PermissionGate action="advertisements.manage">
            <button
              type="button"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white"
              disabled={save.isPending}
              onClick={() => save.mutate(true)}
            >
              Publish
            </button>
          </PermissionGate>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        className="mt-1 w-full rounded-lg border px-3 py-2"
        value={value}
        required={required}
        type={type}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
