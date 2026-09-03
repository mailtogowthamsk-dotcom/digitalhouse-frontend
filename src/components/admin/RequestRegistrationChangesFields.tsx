export const REGISTRATION_CHANGE_FIELD_OPTIONS = [
  { id: "mobile" as const, label: "Mobile number", hint: "Ask the applicant to update their phone number." },
  { id: "profilePhoto" as const, label: "Profile photo", hint: "Ask the applicant to upload a clearer photo." },
  {
    id: "referralCode" as const,
    label: "Referral code",
    hint: "Ask for a code from an existing approved Digital House member."
  }
];

export type RegistrationChangeField = (typeof REGISTRATION_CHANGE_FIELD_OPTIONS)[number]["id"];

export type RequestRegistrationChangesForm = {
  remarks: string;
  fields: Record<RegistrationChangeField, boolean>;
};

export const EMPTY_CHANGE_REQUEST_FORM: RequestRegistrationChangesForm = {
  remarks: "Please update the requested information and submit again.",
  fields: { mobile: false, profilePhoto: false, referralCode: false }
};

export function selectedChangeFields(
  form: RequestRegistrationChangesForm
): RegistrationChangeField[] {
  return REGISTRATION_CHANGE_FIELD_OPTIONS.map((o) => o.id).filter((id) => form.fields[id]);
}

type Props = {
  form: RequestRegistrationChangesForm;
  onChange: (next: RequestRegistrationChangesForm) => void;
  disabledFields?: Partial<Record<RegistrationChangeField, boolean>>;
};

export function RequestRegistrationChangesFields({ form, onChange, disabledFields }: Props) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ask the applicant to provide</p>
      {REGISTRATION_CHANGE_FIELD_OPTIONS.map((opt) => {
        const disabled = !!disabledFields?.[opt.id];
        return (
          <label
            key={opt.id}
            className={`flex gap-3 rounded-lg border border-slate-200 p-3 ${
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50"
            }`}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={form.fields[opt.id]}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...form,
                  fields: { ...form.fields, [opt.id]: e.target.checked }
                })
              }
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">{opt.label}</span>
              <span className="block text-xs text-slate-500">
                {disabled && opt.id === "referralCode"
                  ? "A referral is already submitted or confirmed. Confirm or reject it first."
                  : opt.hint}
              </span>
            </span>
          </label>
        );
      })}
      <label className="block text-sm">
        <span className="text-xs font-medium text-slate-500">Message to the applicant</span>
        <textarea
          className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={form.remarks}
          onChange={(e) => onChange({ ...form, remarks: e.target.value })}
          placeholder="Explain what they should correct"
        />
      </label>
    </div>
  );
}
