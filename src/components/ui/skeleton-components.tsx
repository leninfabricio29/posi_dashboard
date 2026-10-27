import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

/**
 * Skeleton para StatCard - imita la estructura real
 */
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <Card elevated className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton para OrderCard - imita card de pedido
 */
export function SkeletonOrderCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-3 w-full" />
      <div className="flex justify-end">
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton para TableCard - imita card de mesa
 */
export function SkeletonTableCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border-2 p-2.5 space-y-1", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="size-4 rounded-full" />
      </div>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/**
 * Skeleton para lista de items
 */
export function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 p-3", className)}>
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

/**
 * Skeleton para tabla
 */
export function SkeletonTable({ 
  rows = 5,
  columns = 4,
  className 
}: { 
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border overflow-hidden", className)}>
      {/* Header */}
      <div className="bg-muted/50 border-b p-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="p-3">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton para Form
 */
export function SkeletonForm({ 
  fields = 4,
  className 
}: { 
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={`field-${i}`} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-2 justify-end pt-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton para Card con header y content
 */
export function SkeletonCard({ 
  hasActions = false,
  contentRows = 3,
  className 
}: { 
  hasActions?: boolean;
  contentRows?: number;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-soft", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          {hasActions && <Skeleton className="h-9 w-28 rounded-lg" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: contentRows }).map((_, i) => (
          <Skeleton key={`content-${i}`} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para Dashboard Stats (4 stats)
 */
export function SkeletonDashboardStats({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonStatCard key={`stat-${i}`} />
      ))}
    </div>
  );
}

/**
 * Skeleton para mapa de mesas por áreas
 */
export function SkeletonTableMap({ 
  areas = 2,
  tablesPerArea = 6,
  className 
}: { 
  areas?: number;
  tablesPerArea?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      {Array.from({ length: areas }).map((_, areaIndex) => (
        <div key={`area-${areaIndex}`}>
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
            {Array.from({ length: tablesPerArea }).map((_, tableIndex) => (
              <SkeletonTableCard key={`table-${areaIndex}-${tableIndex}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para lista de pedidos activos
 */
export function SkeletonOrdersList({ 
  count = 5,
  className 
}: { 
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("divide-y rounded-lg border", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={`order-${i}`} />
      ))}
    </div>
  );
}

/**
 * Skeleton para modal/dialog
 */
export function SkeletonDialog({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>
      
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-lg" />
        <SkeletonForm fields={2} />
      </div>
      
      <div className="flex gap-2 justify-end pt-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton para producto en grid
 */
export function SkeletonProductCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border p-2.5 space-y-2", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-8 w-full rounded-md" />
    </div>
  );
}

/**
 * Skeleton para grid de productos
 */
export function SkeletonProductGrid({ 
  count = 8,
  className 
}: { 
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={`product-${i}`} />
      ))}
    </div>
  );
}

/**
 * Skeleton para página completa de Dashboard
 */
export function SkeletonDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Stats */}
      <SkeletonDashboardStats />

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonCard hasActions contentRows={4} />
        <SkeletonCard hasActions contentRows={6} className="lg:col-span-2" />
      </div>

      {/* Table Map */}
      <Card className="shadow-soft">
        <CardContent>
          <SkeletonTableMap />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton genérico con animación shimmer
 */
export function SkeletonShimmer({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "loading-shimmer rounded-lg",
        className
      )}
      {...props}
    />
  );
}
