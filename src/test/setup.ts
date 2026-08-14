/**
 * Vitest global setup — environment-agnostic browser stubs.
 *
 * This file runs in BOTH environments (node default and per-file jsdom via
 * `// @vitest-environment jsdom` docblocks), so every stub must be guarded
 * against the API not existing. Do NOT put `vi.mock` calls here (they belong
 * in test files) and do NOT import jest-dom globally (T4 imports
 * `@testing-library/jest-dom/vitest` per file).
 */

// navigator.vibrate — missing in both jsdom and node
if (typeof navigator !== "undefined" && !navigator.vibrate) {
  navigator.vibrate = () => true;
}

// window.matchMedia — missing in jsdom and node
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// window.scrollTo — missing in jsdom and node
if (typeof window !== "undefined" && !window.scrollTo) {
  window.scrollTo = () => {};
}

// document.hidden — may be undefined in jsdom (and node); define when missing
if (typeof document !== "undefined" && document.hidden === undefined) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => false,
  });
}
