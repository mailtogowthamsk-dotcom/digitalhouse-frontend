/** First page an admin can open. Moderators have no dashboard. */
const MODULE_HOME: Array<[string, string]> = [
  ["dashboard", "/dashboard"],
  ["users", "/users"],
  ["registration_requests", "/registration-requests"],
  ["matrimony_reports", "/matrimony-reports"],
  ["helping_hands", "/helping-hand"],
  ["support", "/support"]
];

export function adminHomePath(hasModule: (module: string) => boolean): string {
  for (const [module, path] of MODULE_HOME) {
    if (hasModule(module)) return path;
  }
  return "/login";
}
