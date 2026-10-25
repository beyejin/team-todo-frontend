import * as matchers from "@testing-library/jest-dom/matchers";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

// Vitest 5 has two matcher parameters; jest-dom's /vitest entry still uses one.
declare module "vitest" {
  interface Matchers<R, T> extends TestingLibraryMatchers<T, R> {
    toBeInTheDocument(): R;
  }
}

expect.extend(matchers);

afterEach(cleanup);

class TestMediaQueryList extends EventTarget implements MediaQueryList {
  readonly matches = false;
  onchange: MediaQueryList["onchange"] = null;

  constructor(readonly media: string) {
    super();
  }

  addListener(): void {
    // Retained for libraries that still use the legacy MediaQueryList interface.
  }

  removeListener(): void {
    // No legacy listener is registered in this static viewport stub.
  }
}

// JSDOM has no viewport layout. Tests may replace this for a specific query.
Object.defineProperty(window, "matchMedia", {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList => new TestMediaQueryList(query),
});

class TestResizeObserver implements ResizeObserver {
  observe(): void {
    // Layout measurements are covered by the documented browser checks.
  }

  unobserve(): void {
    // No layout observation is registered in JSDOM.
  }

  disconnect(): void {
    // No layout observation is registered in JSDOM.
  }
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: TestResizeObserver,
});

// JSDOM lacks native modal methods; Astryx owns dismissal and focus restoration.
// Browser checks still verify top-layer rendering, focus trapping, and backdrops.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = true;
    },
  },
  close: {
    configurable: true,
    value(this: HTMLDialogElement): void {
      this.open = false;
    },
  },
});

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  writable: true,
  value(): void {
    // JSDOM has no scroll layout; modal scroll restoration needs a browser check.
  },
});
