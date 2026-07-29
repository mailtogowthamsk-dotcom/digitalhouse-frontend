import { useCallback, useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
};

type ToolbarCmd =
  | "bold"
  | "italic"
  | "underline"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "formatBlock"
  | "createLink"
  | "undo"
  | "redo";

function runCommand(cmd: ToolbarCmd, value?: string) {
  // contentEditable admin editor — execCommand is adequate without TipTap.
  document.execCommand(cmd, false, value);
}

const TOOLBAR: Array<
  | { label: string; title: string; action: () => void; sep?: never }
  | { sep: true; label?: never; title?: never; action?: never }
> = [
  { label: "B", title: "Bold", action: () => runCommand("bold") },
  { label: "I", title: "Italic", action: () => runCommand("italic") },
  { label: "U", title: "Underline", action: () => runCommand("underline") },
  { sep: true },
  {
    label: "H2",
    title: "Heading 2",
    action: () => runCommand("formatBlock", "h2")
  },
  {
    label: "H3",
    title: "Heading 3",
    action: () => runCommand("formatBlock", "h3")
  },
  { sep: true },
  {
    label: "• List",
    title: "Bullet list",
    action: () => runCommand("insertUnorderedList")
  },
  {
    label: "1. List",
    title: "Numbered list",
    action: () => runCommand("insertOrderedList")
  },
  {
    label: "Quote",
    title: "Blockquote",
    action: () => runCommand("formatBlock", "blockquote")
  },
  { sep: true },
  {
    label: "Link",
    title: "Insert link",
    action: () => {
      const url = window.prompt("Link URL", "https://");
      if (url) runCommand("createLink", url);
    }
  },
  { sep: true },
  { label: "Undo", title: "Undo", action: () => runCommand("undo") },
  { label: "Redo", title: "Redo", action: () => runCommand("redo") }
];

export function LegalRichTextEditor({
  value,
  onChange,
  disabled = false,
  className = "",
  minHeight = "280px"
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== lastEmitted.current && el.innerHTML !== value) {
      el.innerHTML = value || "";
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  }, [onChange]);

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
        {TOOLBAR.map((item, i) =>
          item.sep ? (
            <span key={`sep-${i}`} className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden />
          ) : (
            <button
              key={item.title}
              type="button"
              title={item.title}
              disabled={disabled}
              className="rounded px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-sm disabled:opacity-40"
              onMouseDown={(e) => {
                e.preventDefault();
                item.action();
                emit();
              }}
            >
              {item.label === "B" ? (
                <span className="font-bold">B</span>
              ) : item.label === "I" ? (
                <span className="italic">I</span>
              ) : item.label === "U" ? (
                <span className="underline">U</span>
              ) : (
                item.label
              )}
            </button>
          )
        )}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline
        aria-label="Legal document content"
        contentEditable={!disabled}
        suppressContentEditableWarning
        className="prose prose-slate max-w-none px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30 disabled:bg-slate-50 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
      />
    </div>
  );
}
