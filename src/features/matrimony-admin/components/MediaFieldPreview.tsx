import { useState } from "react";

const MEDIA_FIELDS = new Set(["candidatePhotoUrl", "profilePhotoUrl", "horoscopeDocumentUrl"]);

function isImageUrl(url: string): boolean {
  const path = url.split("?")[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/.test(path);
}

export function isMatrimonyMediaField(field: string): boolean {
  return MEDIA_FIELDS.has(field);
}

export function MediaFieldPreview({ url, label }: { url: string; label: string }) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <p className="text-xs text-red-600">
        Could not load preview.{" "}
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium underline">
          Open link
        </a>
      </p>
    );
  }

  if (isImageUrl(url)) {
    return (
      <div className="mt-1 space-y-1">
        <img
          src={url}
          alt={label}
          loading="lazy"
          className="max-h-40 w-full rounded-md border border-slate-200 object-contain bg-white"
          onError={() => setBroken(true)}
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-primary hover:underline"
        >
          Open full size
        </a>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
    >
      Open document (PDF)
    </a>
  );
}
