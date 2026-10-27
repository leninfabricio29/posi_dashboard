import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "cn";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
  valueClassName?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
  className,
  valueClassName,
}: StatCardProps) {
  const trendIsPositive = trend && trend.value > 0;
  const trendIsNegative = trend && trend.value < 0;

  return (
    <Card elevated className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                {icon}
              </div>
            )}
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
          </div>
          
          <div>
            <p className={cn(
              "text-3xl font-bold tracking-tight tabular-nums",
              valueClassName
            )}>
              {value}
            </p>
            {hint && (
              <p className="text-xs text-muted-foreground mt-1">{hint}</p>
            )}
          </div>

          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trendIsPositive && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
              trendIsNegative && "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300",
              !trendIsPositive && !trendIsNegative && "bg-muted text-muted-foreground"
            )}>
              <span>
                {trendIsPositive && "↑"}
                {trendIsNegative && "↓"}
                {Math.abs(trend.value)}%
              </span>
              {trend.label && <span>{trend.label}</span>}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
