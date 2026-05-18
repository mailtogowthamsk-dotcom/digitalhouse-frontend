import { useState } from "react";

function MediaImg({
  src,
  alt,
  className,
  onBroken
}: {
  src: string;
  alt: string;
  className?: string;
  onBroken: () => void;
}) {
  return <img src={src} alt={alt} loading="lazy" className={className} onError={onBroken} />;
}

function isImageUrl(url: string): boolean {
  const path = url.split("?")[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/.test(path);
}

export function MediaGallery({
  profilePhoto,
  horoscopeUrl
}: {
  profilePhoto?: string | null;
  horoscopeUrl?: string | null;
}) {
  const [zoom, setZoom] = useState<string | null>(null);
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const items = [
    profilePhoto ? { label: "Bride/groom photo", url: profilePhoto } : null,
    horoscopeUrl ? { label: "Horoscope", url: horoscopeUrl } : null
  ].filter(Boolean) as { label: string; url: string }[];

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No media uploaded.</p>;
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) =>
          broken[item.label] ? (
            <div key={item.label} className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">{item.label}</p>
              <p className="mt-1 text-xs text-red-700">Preview failed — refresh or open link.</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
              >
                Open in new tab
              </a>
            </div>
          ) : isImageUrl(item.url) ? (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">{item.label}</p>
              <button type="button" onClick={() => setZoom(item.url)} className="block w-full">
                <MediaImg
                  src={item.url}
                  alt={item.label}
                  className="max-h-56 w-full rounded-md object-contain"
                  onBroken={() => setBroken((b) => ({ ...b, [item.label]: true }))}
                />
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
              >
                Open / download
              </a>
            </div>
          ) : (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">{item.label}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                Preview document (PDF)
              </a>
            </div>
          )
        )}
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
          onKeyDown={() => {}}
          role="presentation"
        >
          <img
            src={zoom}
            alt="Zoom"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
