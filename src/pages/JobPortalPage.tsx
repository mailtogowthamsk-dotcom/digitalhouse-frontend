
export function JobPortalPage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Job Portal Moderation</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="mb-4 text-slate-600">
          Review job postings, approve or reject employers, remove fake or spam jobs, and suspend abusive employers.
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>Review job postings</li>
          <li>Approve / reject employers</li>
          <li>Remove fake or spam jobs</li>
          <li>Suspend abusive employers</li>
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          This module will be available when the backend job portal API is connected.
        </p>
      </div>
    </div>
  );
}
