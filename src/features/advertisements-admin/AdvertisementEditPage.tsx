import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getAdminAdvertisement, updateAdminAdvertisement } from "./api";
import { AdvertisementMediaPreview } from "./AdvertisementMediaPreview";
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

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdvertisementEditPage() {
  const { id } = useParams();
  const adId = Number(id);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
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
    latitude: "",
    longitude: "",
    ctaType: "CALL",
    ctaLabel: "Call Now",
    mediaFileId: "",
    scheduledStartAt: "",
    scheduledEndAt: ""
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ad", adId],
    queryFn: () => getAdminAdvertisement(adId),
    enabled: Number.isFinite(adId)
  });

  useEffect(() => {
    const ad = data?.advertisement as Record<string, any> | undefined;
    if (!ad) return;
    setForm({
      typeCode: ad.typeCode || "IMAGE_BANNER",
      businessName: ad.businessName || ad.business?.name || "",
      businessCategory: ad.businessCategory || ad.business?.category || "RETAIL",
      title: ad.title || "",
      shortDescription: ad.shortDescription || "",
      description: ad.description || "",
      contactPhone: ad.contact?.phone || ad.contactPhone || "",
      whatsappNumber: ad.contact?.whatsapp || ad.whatsappNumber || "",
      contactEmail: ad.contact?.email || ad.contactEmail || "",
      websiteUrl: ad.contact?.website || ad.websiteUrl || ad.destinationUrl || "",
      address: ad.location?.address || ad.address || "",
      city: ad.location?.city || ad.city || "",
      district: ad.location?.district || ad.district || "",
      state: ad.location?.state || ad.state || "",
      pincode: ad.location?.pincode || ad.pincode || "",
      latitude: ad.location?.latitude != null ? String(ad.location.latitude) : "",
      longitude: ad.location?.longitude != null ? String(ad.location.longitude) : "",
      ctaType: ad.cta?.type || ad.ctaType || "CALL",
      ctaLabel: ad.cta?.label || ad.ctaLabel || "Call Now",
      mediaFileId: "",
      scheduledStartAt: toLocalInput(ad.scheduledStartAt),
      scheduledEndAt: toLocalInput(ad.scheduledEndAt)
    });
  }, [data]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const ad = (data?.advertisement || {}) as Record<string, any>;

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
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
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        ctaType: form.ctaType,
        ctaLabel: form.ctaLabel,
        scheduledStartAt: form.scheduledStartAt ? new Date(form.scheduledStartAt).toISOString() : null,
        scheduledEndAt: form.scheduledEndAt ? new Date(form.scheduledEndAt).toISOString() : null
      };
      if (form.mediaFileId) body.mediaFileId = Number(form.mediaFileId);
      return updateAdminAdvertisement(adId, body);
    },
    onSuccess: () => {
      addToast("Advertisement updated.", "success");
      navigate(`/advertisements/${adId}`);
    },
    onError: (e: Error) => addToast(e.message, "error")
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <Link to={`/advertisements/${adId}`} className="text-sm text-primary">
        ← Back to advertisement
      </Link>
      <h2 className="text-xl font-semibold">Edit advertisement</h2>
      <p className="text-sm text-slate-500">
        Updates the existing campaign. Leave media file ID empty to keep the current image or video.
      </p>
      <section className="rounded-xl border bg-white p-4">
        <h3 className="font-medium">Current media</h3>
        <AdvertisementMediaPreview mediaUrl={ad.mediaUrl} thumbnailUrl={ad.thumbnailUrl} mediaKind={ad.mediaKind} />
      </section>
      <form
        className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
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
        <Field label="Latitude" value={form.latitude} onChange={(v) => set("latitude", v)} />
        <Field label="Longitude" value={form.longitude} onChange={(v) => set("longitude", v)} />
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
        <Field label="Replace media file ID" value={form.mediaFileId} onChange={(v) => set("mediaFileId", v)} />
        <Field label="Start" value={form.scheduledStartAt} onChange={(v) => set("scheduledStartAt", v)} type="datetime-local" />
        <Field label="End" value={form.scheduledEndAt} onChange={(v) => set("scheduledEndAt", v)} type="datetime-local" />
        <div className="sm:col-span-2 flex gap-2">
          <PermissionGate action="advertisements.manage">
            <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white" disabled={save.isPending}>
              Save changes
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
  type
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
