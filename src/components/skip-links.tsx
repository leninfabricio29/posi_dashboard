"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Skip Links Component
 * Provides keyboard navigation to skip repetitive content.
 * Only visible when focused (accessible keyboard users).
 * 
 * WCAG 2.1 Level A: 2.4.1 Bypass Blocks
 */
export function SkipLinks() {
  const skipLinks = [
    { id: "main-content", label: "Ir al contenido principal" },
    { id: "sidebar", label: "Ir a la navegación lateral" },
    { id: "footer", label: "Ir al pie de página" },
  ];

  return (
    <div className="sr-only focus-within:not-sr-only">
      <ul className="fixed inset-0 z-50 flex flex-col gap-2 bg-black p-4 text-white">
        {skipLinks.map((link) => (
          <li key={link.id}>
            <a
              href={`#${link.id}`}
              className={cn(
                "inline-block rounded px-4 py-2",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "transition-colors"
              )}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
