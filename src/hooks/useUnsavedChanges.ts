import { useEffect } from "react";

export type UnsavedBlocker = {
  state: "unblocked" | "blocked" | "proceeding";
  proceed?: () => void;
  reset?: () => void;
};

const IDLE: UnsavedBlocker = { state: "unblocked" };

/**
 * Warn on tab close/refresh (beforeunload).
 * Optional in-app navigation guard via capture-phase link click confirm
 * (compatible with BrowserRouter; useBlocker requires a data router).
 */
export function useUnsavedChanges(
  when: boolean,
  message = "You have unsaved changes. Leave this page anyway?"
): UnsavedBlocker {
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  useEffect(() => {
    if (!when) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let next: URL;
      try {
        next = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (next.origin !== window.location.origin) return;
      const same =
        next.pathname === window.location.pathname &&
        next.search === window.location.search;
      if (same) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [when, message]);

  return IDLE;
}
