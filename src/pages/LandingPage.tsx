import { useNavigate } from "react-router-dom";

function Logo() {
  return (
    <div className="mb-6 flex justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-10 w-10"
          aria-hidden
        >
          <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
          <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
        </svg>
      </div>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg text-center">
        <Logo />
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Digital House</h1>
        <p className="mb-8 text-slate-600">Admin Console</p>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Login
        </button>
        <p className="mt-6 text-xs text-slate-500">No signup. Admins are pre-created internally.</p>
      </div>
    </div>
  );
}
