import { useState } from "react";

function CompareImg({
  src,
  alt,
  onBroken
}: {
  src: string;
  alt: string;
  onBroken: () => void;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="mx-auto max-h-52 w-full rounded-md object-contain"
      onError={onBroken}
    />
  );
}

type PhotoVerification = {
  profileFor?: string;
  profileForSelf?: boolean;
  useAccountProfilePhoto?: boolean;
  candidatePhotoStatus?: string | null;
  accountOwnerPhoto?: string | null;
  matrimonyCandidatePhoto?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REUPLOAD_REQUESTED: "Reupload requested"
};

export function OwnerCandidateMediaCompare({
  photoVerification,
  horoscopeUrl
}: {
  photoVerification?: PhotoVerification | null;
  horoscopeUrl?: string | null;
}) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const pv = photoVerification ?? {};
  const owner = pv.accountOwnerPhoto ?? null;
  const candidate = pv.matrimonyCandidatePhoto ?? null;
  const profileFor = pv.profileFor ?? "—";
  const status = pv.candidatePhotoStatus
    ? STATUS_LABELS[pv.candidatePhotoStatus] ?? pv.candidatePhotoStatus
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Trust verification — compare photos</p>
        <p className="mt-1 text-amber-800">
          Profile for: <strong>{profileFor}</strong>
          {pv.profileForSelf && pv.useAccountProfilePhoto
            ? " · Candidate photo reuses account profile (self)"
            : pv.profileForSelf
              ? " · Dedicated matrimony photo"
              : " · Family-managed — account photo must not be used as bride/groom"}
        </p>
        {status && (
          <p className="mt-1 text-xs font-medium text-amber-900">Candidate photo status: {status}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Account owner photo
          </p>
          <p className="mb-3 text-xs text-slate-600">Social account identity (submitter)</p>
          {!owner ? (
            <p className="text-sm text-slate-500">No account profile photo</p>
          ) : broken.owner ? (
            <p className="text-sm text-red-700">Preview failed</p>
          ) : (
            <CompareImg
              src={owner}
              alt="Account owner"
              onBroken={() => setBroken((b) => ({ ...b, owner: true }))}
            />
          )}
        </div>

        <div className="rounded-lg border-2 border-primary/30 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
            Matrimony candidate photo
          </p>
          <p className="mb-3 text-xs text-slate-600">Bride/groom — verify this matches the candidate</p>
          {!candidate ? (
            <p className="text-sm font-medium text-red-700">No bride/groom photo uploaded</p>
          ) : broken.candidate ? (
            <p className="text-sm text-red-700">Preview failed</p>
          ) : (
            <CompareImg
              src={candidate}
              alt="Matrimony candidate"
              onBroken={() => setBroken((b) => ({ ...b, candidate: true }))}
            />
          )}
        </div>
      </div>

      {horoscopeUrl && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Horoscope document</p>
          <a
            href={horoscopeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            Open horoscope
          </a>
        </div>
      )}
    </div>
  );
}
