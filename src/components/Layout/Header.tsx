import { useAuth } from "../../context/AuthContext";

export function Header({ title }: { title: string }) {
  const { adminEmail } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">{adminEmail ?? "Admin"}</span>
      </div>
    </header>
  );
}
