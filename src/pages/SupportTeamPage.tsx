import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addSupportMember,
  listSupportMembers,
  removeSupportMember,
  updateSupportMember
} from "../api/registrationDesk";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function SupportTeamPage() {
  const { hasAction } = useAuth();
  const canManage = hasAction("registration_requests.manage_team");
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const list = useQuery({ queryKey: ["support-team"], queryFn: listSupportMembers });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["support-team"] });

  const save = useMutation({
    mutationFn: async (action: { type: "add" } | { type: "save"; id: number } | { type: "toggle"; id: number; isActive: boolean } | { type: "remove"; id: number }) => {
      if (action.type === "add") return addSupportMember({ name: name.trim() || undefined, email: email.trim() });
      if (action.type === "save") return updateSupportMember(action.id, { name: editName, email: editEmail });
      if (action.type === "toggle") return updateSupportMember(action.id, { isActive: action.isActive });
      return removeSupportMember(action.id);
    },
    onSuccess: async (_data, action) => {
      if (action.type === "add") {
        setName("");
        setEmail("");
      }
      setEditing(null);
      addToast("Saved.", "success");
      await refresh();
    },
    onError: (err) => addToast(err instanceof Error ? err.message : "Could not save", "error")
  });

  return (
    <div className="space-y-4">
      <div>
        <Link to="/registration-requests" className="text-sm text-primary hover:underline">
          Registration requests
        </Link>
        <h1 className="mt-1 text-xl font-bold text-slate-900">Support Team</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          These addresses receive registration emails. Adding an email does not create an admin login.
          Someone can claim a request only if this email matches their existing admin account and the member is active.
        </p>
      </div>

      {canManage ? (
        <form
          className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({ type: "add" });
          }}
        >
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Display name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white" disabled={save.isPending}>
            Add member
          </button>
        </form>
      ) : (
        <p className="text-sm text-slate-500">You can view the team. Only an administrator can change it.</p>
      )}

      {list.isError ? (
        <p className="text-sm text-red-600">{list.error instanceof Error ? list.error.message : "Could not load the team"}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Added</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(list.data ?? []).map((member) => (
                <tr key={member.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {editing === member.id ? (
                      <input className="w-full rounded border border-slate-300 px-2 py-1" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : (
                      member.name || "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editing === member.id ? (
                      <input className="w-full rounded border border-slate-300 px-2 py-1" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                    ) : (
                      member.email
                    )}
                  </td>
                  <td className="px-3 py-2">{member.isActive ? "Active" : "Disabled"}</td>
                  <td className="px-3 py-2">{new Date(member.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {canManage ? (
                      <div className="flex flex-wrap gap-2">
                        {editing === member.id ? (
                          <button type="button" className="font-semibold text-primary" onClick={() => save.mutate({ type: "save", id: member.id })}>
                            Save
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="font-semibold text-primary"
                            onClick={() => {
                              setEditing(member.id);
                              setEditName(member.name || "");
                              setEditEmail(member.email);
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          className="font-semibold text-slate-700"
                          onClick={() => save.mutate({ type: "toggle", id: member.id, isActive: !member.isActive })}
                        >
                          {member.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-red-700"
                          onClick={() => {
                            if (window.confirm("Remove this member? Past assignments stay in history.")) {
                              save.mutate({ type: "remove", id: member.id });
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!list.isLoading && (list.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-slate-500">
                    No support members yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
