import { JSDOM } from "jsdom";

/**
 * Environnement DOM minimal pour monter reellement les composants.
 *
 * Le depot n'avait aucune stack de test DOM : ni Testing Library, ni jsdom, ni
 * Playwright, ni Cypress. Deux devDependencies ont ete ajoutees — `jsdom` et
 * `@testing-library/react` — et rien d'autre : `fireEvent` emet de vrais
 * evenements DOM, que React traite par son systeme synthetique habituel.
 *
 * jsdom fournit aussi une vraie `window.history` : c'est elle qui permet de
 * tester Precedent/Suivant du navigateur plutot que de les simuler.
 */

const DEFAULT_URL = "http://localhost/dashboard/admin/incubation-followups";

/** jsdom declenche `popstate` de facon asynchrone : laisser la boucle tourner. */
export function flushHistory() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function installDom(url = DEFAULT_URL) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url,
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // `navigator` est en lecture seule sur le global de Node : passer par
  // defineProperty plutot que par une affectation, qui echouerait en silence.
  for (const key of ["window", "document", "navigator"]) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: key === "window" ? window : window[key],
    });
  }

  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in globalThis) {
      continue;
    }

    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: window[key],
    });
  }

  // React 19 exige ce drapeau pour que `act()` encadre les rendus.
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return {
    window,
    cleanup() {
      window.close();
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    },
  };
}
