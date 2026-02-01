
export function CommunityContentPage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Community Content Management</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="mb-4 text-slate-600">
          Manage community history, Kulam details, static content pages, and announcements.
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>Community history</li>
          <li>Kulam details</li>
          <li>Static content pages</li>
          <li>Announcements</li>
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          This module will be available when the backend community content API is connected.
        </p>
      </div>
    </div>
  );
}
