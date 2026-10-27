"use client";

import * as React from "react";

/**
 * Polite Live Region
 * Announces dynamic content updates to screen readers without interrupting.
 * Used for: form validation messages, order status updates, etc.
 * 
 * WCAG 2.1 Level A: 4.1.3 Status Messages
 */
export function PoliteRegion({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}

/**
 * Assertive Live Region
 * Announces urgent updates immediately to screen readers.
 * Used for: errors, critical alerts, etc.
 * 
 * WCAG 2.1 Level A: 4.1.3 Status Messages
 */
export function AssertiveRegion({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
}

/**
 * useAnnounce Hook
 * Helper for announcing messages to screen readers.
 * 
 * Usage:
 * const announce = useAnnounce();
 * announce("Pedido actualizado", "polite");
 */
export function useAnnounce() {
  const politeRef = React.useRef<HTMLDivElement>(null);
  const assertiveRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Create live regions if they don't exist
    if (!politeRef.current) {
      politeRef.current = document.createElement("div");
      politeRef.current.id = "announce-polite";
      politeRef.current.role = "status";
      politeRef.current.setAttribute("aria-live", "polite");
      politeRef.current.setAttribute("aria-atomic", "true");
      politeRef.current.className = "sr-only";
      document.body.appendChild(politeRef.current);
    }

    if (!assertiveRef.current) {
      assertiveRef.current = document.createElement("div");
      assertiveRef.current.id = "announce-assertive";
      assertiveRef.current.role = "alert";
      assertiveRef.current.setAttribute("aria-live", "assertive");
      assertiveRef.current.setAttribute("aria-atomic", "true");
      assertiveRef.current.className = "sr-only";
      document.body.appendChild(assertiveRef.current);
    }

    return () => {
      // Cleanup
      politeRef.current?.remove();
      assertiveRef.current?.remove();
    };
  }, []);

  return (message: string, priority: "polite" | "assertive" = "polite") => {
    const ref = priority === "polite" ? politeRef : assertiveRef;
    if (ref.current) {
      ref.current.textContent = message;
    }
  };
}
