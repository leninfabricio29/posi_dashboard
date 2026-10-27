import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react"
import { cn } from "cn"

type ValidationState = "success" | "error" | "warning" | undefined;

interface InputProps extends React.ComponentProps<"input"> {
  validationState?: ValidationState;
  helperText?: string;
}

const validationStyles = {
  success: "border-success focus-visible:border-success focus-visible:ring-success/50",
  error: "border-error focus-visible:border-error focus-visible:ring-error/50",
  warning: "border-warning focus-visible:border-warning focus-visible:ring-warning/50",
};

const validationIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
};

const validationIconColors = {
  success: "text-success",
  error: "text-error",
  warning: "text-warning",
};

function Input({ 
  className, 
  type, 
  validationState,
  helperText,
  ...props 
}: InputProps) {
  const ValidationIcon = validationState ? validationIcons[validationState] : null;
  
  return (
    <div className="w-full">
      <div className="relative">
        <InputPrimitive
          type={type}
          data-slot="input"
          className={cn(
            "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors-smooth outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
            // Validation states
            validationState && validationStyles[validationState],
            // Espacio para icono de validación
            validationState && "pr-10",
            className
          )}
          {...props}
        />
        {ValidationIcon && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <ValidationIcon className={cn("size-4", validationIconColors[validationState!])} />
          </div>
        )}
      </div>
      {helperText && (
        <p className={cn(
          "mt-1.5 text-xs transition-colors",
          validationState === "error" && "text-error",
          validationState === "warning" && "text-warning",
          validationState === "success" && "text-success",
          !validationState && "text-muted-foreground"
        )}>
          {helperText}
        </p>
      )}
    </div>
  )
}

export { Input }
export type { ValidationState, InputProps }
