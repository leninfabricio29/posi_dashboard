/**
 * useFocusTrap Hook
 * Traps focus within a modal/dialog container.
 * Ensures keyboard navigation stays within the modal when it's open.
 * 
 * WCAG 2.1 Level A: 2.1.1 Keyboard
 * WCAG 2.1 Level AA: 2.4.3 Focus Order
 */

import * as React from "react";

const FOCUSABLE_SELECTORS = [
  "button",
  "[href]",
  "input",
  "select",
  "textarea",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean = true) {
  React.useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));

    if (focusableElements.length === 0) return;

    // Focus the first element when modal opens
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Store the element that had focus before the trap was activated
    const previouslyFocusedElement = document.activeElement as HTMLElement;

    // Focus the first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Tab key
      if (e.key !== "Tab") return;

      const activeElement = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        // Shift+Tab
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      // Restore focus to previously focused element
      previouslyFocusedElement?.focus();
    };
  }, [containerRef, isActive]);
}

/**
 * useRestoreFocus Hook
 * Restores focus to the element that triggered a modal/dialog.
 * Called when the modal closes.
 * 
 * WCAG 2.1 Level A: 2.4.3 Focus Order
 */
export function useRestoreFocus(triggerRef: React.RefObject<HTMLElement>, isOpen: boolean) {
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      // Restore focus to the trigger element
      if (triggerRef.current && previousFocusRef.current) {
        triggerRef.current.focus();
      }
    }
  }, [isOpen, triggerRef]);
}
