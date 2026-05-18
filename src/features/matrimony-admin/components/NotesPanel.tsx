import { useState } from "react";
import type { MatrimonyNote } from "../types";

export function NotesPanel({
  notes,
  onAdd,
  loading
}: {
  notes: MatrimonyNote[];
  onAdd: (content: string, noteType: "REVIEW" | "WARNING" | "MODERATION" | "INTERNAL") => void;
  loading?: boolean;
}) {
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<"REVIEW" | "WARNING" | "MODERATION" | "INTERNAL">(
    "INTERNAL"
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Admin notes
      </h3>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <select
          value={noteType}
          onChange={(e) => setNoteType(e.target.value as typeof noteType)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="INTERNAL">Internal</option>
          <option value="REVIEW">Review</option>
          <option value="WARNING">Warning</option>
          <option value="MODERATION">Moderation</option>
        </select>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!content.trim() || loading}
          onClick={() => {
            onAdd(content.trim(), noteType);
            setContent("");
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          Add note
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-slate-500">No notes yet.</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
              <div className="mb-1 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="font-semibold uppercase">{n.noteType}</span>
                <span>{n.createdBy}</span>
                <span>{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-slate-800">{n.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
