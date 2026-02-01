
export function HelpingHandPage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Helping Hand Requests</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="mb-4 text-slate-600">
          Verify request authenticity, approve fund-raising posts, freeze suspicious requests, and mark requests as completed.
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>Verify request authenticity</li>
          <li>Approve fund-raising posts</li>
          <li>Freeze suspicious requests</li>
          <li>Mark requests as completed</li>
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          This module will be available when the backend Helping Hand API is connected.
        </p>
      </div>
    </div>
  );
}
