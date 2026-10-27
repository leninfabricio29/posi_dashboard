"use client";

import * as React from "react";

interface AccessibleFormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

/**
 * AccessibleFormField Component
 * Wraps form inputs with proper ARIA labels, error messages, and hints.
 * Ensures keyboard navigation and screen reader compatibility.
 * 
 * WCAG 2.1 Level A: 1.3.1 Info and Relationships, 3.3.1 Error Identification
 * WCAG 2.1 Level AA: 1.4.3 Contrast (Minimum)
 */
export function AccessibleFormField({
  id,
  label,
  error,
  hint,
  required,
  children,
}: AccessibleFormFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const descriptionIds = [errorId, hintId].filter(Boolean).join(" ");

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-1" aria-label="requerido">*</span>}
      </label>

      <div>
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
              id,
              "aria-invalid": !!error,
              "aria-describedby": descriptionIds || undefined,
            })
          : children}
      </div>

      <div className="space-y-1">
        {hint && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Form validation helper
 * Returns error message for a form field based on validation state
 */
export function getFieldError(
  touched?: boolean,
  error?: string
): string | undefined {
  if (touched && error) {
    return error;
  }
  return undefined;
}

/**
 * Announce form submission results
 * Useful for announcing success or error messages to screen readers
 */
export function useFormAnnounce() {
  const announceRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!announceRef.current) {
      announceRef.current = document.createElement("div");
      announceRef.current.id = "form-announce";
      announceRef.current.role = "alert";
      announceRef.current.setAttribute("aria-live", "assertive");
      announceRef.current.className = "sr-only";
      document.body.appendChild(announceRef.current);
    }

    return () => {
      announceRef.current?.remove();
    };
  }, []);

  return (message: string) => {
    if (announceRef.current) {
      announceRef.current.textContent = message;
    }
  };
}
