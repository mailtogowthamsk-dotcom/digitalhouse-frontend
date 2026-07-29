import { useAuth } from "../context/AuthContext";

type Props = {
  module?: string;
  action?: string;
  /** Require every listed action. */
  actions?: string[];
  children: React.ReactNode;
  /** Rendered when permission is missing (default: hide). */
  otherwise?: React.ReactNode;
};

/** Hide (or replace) UI when the admin lacks module/action permission. */
export function PermissionGate({
  module,
  action,
  actions,
  children,
  otherwise = null
}: Props) {
  const { hasModule, hasAction, permissionsReady } = useAuth();

  if (!permissionsReady) return null;

  const moduleOk = module ? hasModule(module) : true;
  const actionOk = action ? hasAction(action) : true;
  const actionsOk = actions?.length ? actions.every((a) => hasAction(a)) : true;

  if (moduleOk && actionOk && actionsOk) return <>{children}</>;
  return <>{otherwise}</>;
}
