import { useCallback, useSyncExternalStore } from "react";

/**
 * Remplacant de `next/navigation` pour les tests DOM.
 *
 * Il n'imite pas le routeur : il branche `push` / `replace` / `back` /
 * `forward` sur la **vraie** `window.history` de jsdom, et notifie les
 * composants via `popstate` et un evenement local. Precedent et Suivant du
 * navigateur sont donc reellement exerces, pas simules.
 *
 * `useSyncExternalStore` renvoie une chaine (la query string) plutot que
 * l'objet `URLSearchParams` : un objet neuf a chaque lecture ferait boucler le
 * store en « getSnapshot should be cached ».
 */

const LOCATION_EVENT = "test:locationchange";

// Next patches native history to notify useSearchParams. Match that documented
// integration as well as router.push/replace, while keeping real Back/Forward.
for (const method of ["pushState", "replaceState"]) {
  const original = window.history[method].bind(window.history);
  window.history[method] = (...args) => {
    original(...args);
    window.dispatchEvent(new window.Event(LOCATION_EVENT));
  };
}

function subscribe(onChange) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(LOCATION_EVENT, onChange);

  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(LOCATION_EVENT, onChange);
  };
}

function notify() {
  // `window.Event` et non le global : Node expose son propre `Event`, que
  // `dispatchEvent` de jsdom refuse ("parameter 1 is not of type 'Event'").
  window.dispatchEvent(new window.Event(LOCATION_EVENT));
}

function readSearch() {
  return window.location.search;
}

function readPathname() {
  return window.location.pathname;
}

const serverSnapshot = "";

export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, readSearch, () => serverSnapshot);
  return new URLSearchParams(search);
}

export function usePathname() {
  return useSyncExternalStore(subscribe, readPathname, () => "/");
}

export function useRouter() {
  const push = useCallback((href) => {
    window.history.pushState({}, "", href);
    notify();
  }, []);

  const replace = useCallback((href) => {
    window.history.replaceState({}, "", href);
    notify();
  }, []);

  return {
    push,
    replace,
    back: useCallback(() => window.history.back(), []),
    forward: useCallback(() => window.history.forward(), []),
    refresh: useCallback(() => {}, []),
    prefetch: useCallback(() => {}, []),
  };
}

export function useParams() {
  return {};
}

export function redirect() {
  throw new Error("redirect() n'est pas attendu dans ces tests.");
}

export function notFound() {
  throw new Error("notFound() n'est pas attendu dans ces tests.");
}
