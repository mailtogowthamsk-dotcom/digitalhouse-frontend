import { Link } from "react-router-dom";

export function PostsModerationPage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Posts Moderation</h2>
      <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
        Content-type moderation for announcements and community posts is still planned. Reported posts
        are handled under{" "}
        <Link to="/reports" className="font-medium text-primary hover:underline">
          Reports & Complaints
        </Link>
        .
      </p>
    </div>
  );
}
