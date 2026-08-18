export function AdvertisementMediaPreview({
  mediaUrl,
  thumbnailUrl,
  mediaKind
}: {
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaKind?: string | null;
}) {
  const src = mediaUrl || thumbnailUrl;
  if (!src) return <p className="mt-3 text-sm text-slate-500">No media attached.</p>;
  const isVideo =
    mediaKind === "video" || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(mediaUrl || "") || /\/videos\//i.test(mediaUrl || "");
  if (isVideo && mediaUrl) {
    return (
      <video
        className="mt-3 max-h-80 w-full rounded-lg bg-slate-950"
        src={mediaUrl}
        poster={thumbnailUrl || undefined}
        controls
        playsInline
        preload="metadata"
      >
        Your browser cannot play this video.
      </video>
    );
  }
  return <img src={thumbnailUrl || mediaUrl || ""} alt="" className="mt-3 max-h-64 rounded-lg object-cover" />;
}
