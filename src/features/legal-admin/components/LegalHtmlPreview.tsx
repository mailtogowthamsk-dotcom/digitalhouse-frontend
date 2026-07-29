import { useMemo } from "react";

/** Lightweight client-side strip of script tags and inline event handlers. */
export function sanitizeLegalPreviewHtml(html: string): string {
  if (!html) return "";
  let out = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<\/?script\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript\s*:/gi, "");
  // Strip iframe/object/embed which can host scripts
  out = out
    .replace(/<\/?(iframe|object|embed|link|meta)\b[^>]*>/gi, "")
    .replace(/<\/?(iframe|object|embed|link|meta)\b[^>]*\/?>/gi, "");
  return out;
}

type Props = {
  html: string;
  className?: string;
  emptyLabel?: string;
};

export function LegalHtmlPreview({
  html,
  className = "",
  emptyLabel = "Nothing to preview yet."
}: Props) {
  const safe = useMemo(() => sanitizeLegalPreviewHtml(html), [html]);

  if (!safe.trim()) {
    return (
      <div
        className={`rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 ${className}`}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={`prose prose-slate max-w-none rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 [&_a]:text-primary [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
