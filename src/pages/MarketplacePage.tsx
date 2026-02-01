
export function MarketplacePage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Marketplace Moderation</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="mb-4 text-slate-600">
          Review product listings, verify sellers, remove reported items, and block suspicious listings.
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>Review product listings</li>
          <li>Verify sellers</li>
          <li>Remove reported items</li>
          <li>Block suspicious listings</li>
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          This module will be available when the backend marketplace API is connected.
        </p>
      </div>
    </div>
  );
}
