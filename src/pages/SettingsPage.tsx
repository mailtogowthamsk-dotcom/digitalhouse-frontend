
export function SettingsPage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Settings & Roles</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="font-medium text-slate-900">Roles</h3>
        <ul className="mt-2 list-disc list-inside text-slate-600 text-sm">
          <li>Super Admin</li>
          <li>Admin</li>
          <li>Moderator</li>
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          Permissions: User approval, Profile approval, Content moderation, Notifications access. Role-based access will be enforced when backend supports it.
        </p>
      </div>
    </div>
  );
}
