# Guía de Skeleton Screens

Los skeleton screens mejoran la percepción de velocidad mostrando la estructura del contenido antes de que los datos estén disponibles.

## Principios

1. **Imita la estructura real** - Los skeletons deben reflejar el layout exacto del contenido final
2. **Mantén las proporciones** - Los tamaños deben ser similares al contenido real
3. **Usa consistentemente** - Todos los estados de carga deben usar skeletons
4. **Anima sutilmente** - El efecto shimmer es automático, no agregues más animaciones

## Componentes Disponibles

### SkeletonStatCard
Para cards de estadísticas (ventas, efectivo, etc.)

```tsx
import { SkeletonStatCard } from "@/components/common";

<SkeletonStatCard />
```

### SkeletonDashboardStats
Grid completo de 4 stats para el dashboard

```tsx
import { SkeletonDashboardStats } from "@/components/common";

<SkeletonDashboardStats />
```

### SkeletonOrderCard
Para cards de pedidos individuales

```tsx
import { SkeletonOrderCard } from "@/components/common";

<SkeletonOrderCard />
```

### SkeletonOrdersList
Lista completa de pedidos con divisores

```tsx
import { SkeletonOrdersList } from "@/components/common";

<SkeletonOrdersList count={8} />
```

### SkeletonTableCard
Para cards de mesas en el mapa

```tsx
import { SkeletonTableCard } from "@/components/common";

<SkeletonTableCard />
```

### SkeletonTableMap
Mapa completo de mesas organizadas por áreas

```tsx
import { SkeletonTableMap } from "@/components/common";

<SkeletonTableMap areas={3} tablesPerArea={8} />
```

### SkeletonTable
Para tablas de datos con filas y columnas

```tsx
import { SkeletonTable } from "@/components/common";

<SkeletonTable rows={10} columns={5} />
```

### SkeletonForm
Para formularios con múltiples campos

```tsx
import { SkeletonForm } from "@/components/common";

<SkeletonForm fields={4} />
```

### SkeletonCard
Card genérico con header y content

```tsx
import { SkeletonCard } from "@/components/common";

<SkeletonCard 
  hasActions 
  contentRows={5} 
/>
```

### SkeletonProductCard
Para productos en grid

```tsx
import { SkeletonProductCard } from "@/components/common";

<SkeletonProductCard />
```

### SkeletonProductGrid
Grid completo de productos

```tsx
import { SkeletonProductGrid } from "@/components/common";

<SkeletonProductGrid count={12} />
```

### SkeletonDialog
Para contenido de modales/dialogs

```tsx
import { SkeletonDialog } from "@/components/common";

<SkeletonDialog />
```

### SkeletonDashboardPage
Página completa del dashboard (para usar en suspense boundaries)

```tsx
import { SkeletonDashboardPage } from "@/components/common";

<SkeletonDashboardPage />
```

## LoadingState Mejorado

El componente `LoadingState` ahora soporta variantes:

```tsx
import { LoadingState } from "@/components/common";

// Default: barras simples
<LoadingState rows={5} />

// Lista con items estructurados
<LoadingState variant="list" rows={8} />

// Cards con contenido
<LoadingState variant="card" rows={3} />

// Tabla con header y filas
<LoadingState variant="table" rows={10} />
```

## Ejemplos de Uso

### Dashboard Principal

```tsx
export default function DashboardPage() {
  const { data, isLoading } = useSalesReport(today, today);

  return (
    <>
      <PageHeader title="Dashboard" />

      {isLoading ? (
        <SkeletonDashboardStats />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Stats reales */}
        </div>
      )}
    </>
  );
}
```

### Lista de Pedidos

```tsx
export default function OrdersPage() {
  const { data: orders, isLoading } = useActiveOrders();

  if (isLoading) {
    return <SkeletonOrdersList count={8} />;
  }

  return (
    <div className="divide-y rounded-lg border">
      {orders.map(order => (
        <OrderListItem key={order.id} order={order} />
      ))}
    </div>
  );
}
```

### Mapa de Mesas

```tsx
export default function TablesPage() {
  const { data: mapData, isLoading } = useTableMap();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de Mesas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonTableMap areas={2} tablesPerArea={8} />
        ) : (
          <TableMap areas={mapData} />
        )}
      </CardContent>
    </Card>
  );
}
```

### Formulario en Modal

```tsx
export default function NewOrderDialog({ open }: { open: boolean }) {
  const { data: products, isLoading } = useProducts();

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Pedido</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <SkeletonForm fields={4} />
        ) : (
          <form>
            {/* Formulario real */}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Tabla de Reportes

```tsx
export default function ReportsPage() {
  const { data, isLoading } = useSalesReport(from, to);

  if (isLoading) {
    return <SkeletonTable rows={15} columns={6} />;
  }

  return (
    <Table>
      {/* Tabla real */}
    </Table>
  );
}
```

## Con TanStack Query

Los skeletons funcionan perfectamente con TanStack Query:

```tsx
import { useQuery } from "@tanstack/react-query";
import { SkeletonCard } from "@/components/common";

export default function DataCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["data"],
    queryFn: fetchData,
  });

  if (isLoading) {
    return <SkeletonCard contentRows={4} />;
  }

  if (isError) {
    return <ErrorState message={error.message} />;
  }

  return (
    <Card>
      {/* Contenido real */}
    </Card>
  );
}
```

## Mejores Prácticas

### ✅ Hacer

- Usar el skeleton que mejor imita el contenido final
- Mantener las dimensiones consistentes con el contenido real
- Mostrar skeletons mientras `isLoading === true`
- Combinar skeletons con componentes de error y empty state

```tsx
if (isLoading) return <SkeletonOrdersList />;
if (isError) return <ErrorState message={error} />;
if (!data.length) return <EmptyState title="Sin pedidos" />;
return <OrdersList orders={data} />;
```

### ❌ Evitar

- No uses skeletons genéricos cuando hay uno específico disponible
- No agregues animaciones adicionales
- No uses skeletons para estados de error
- No mezcles skeletons y spinners en el mismo componente

```tsx
// ❌ Malo
if (isLoading) return <Spinner />;

// ✅ Bueno
if (isLoading) return <SkeletonOrdersList />;
```

## Personalización

Puedes personalizar los skeletons con las props `className`:

```tsx
<SkeletonStatCard className="border-primary" />
<SkeletonTable rows={20} className="max-h-96 overflow-auto" />
```

## Accesibilidad

Todos los skeleton components incluyen:
- `aria-busy="true"` - Indica que está cargando
- `aria-label="Cargando"` - Descripción para screen readers

Los skeletons son automáticamente anunciados por screen readers como "Cargando".

## Performance

Los skeletons son componentes ligeros que:
- No realizan fetching de datos
- No tienen state interno complejo
- Usan animaciones CSS optimizadas
- Se renderizan instantáneamente

## Animación Shimmer

La animación shimmer está definida globalmente en `globals.css`:

```css
.loading-shimmer {
  @apply animate-pulse bg-gradient-to-r from-muted via-muted/80 to-muted;
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

No necesitas aplicar clases de animación manualmente, el componente `Skeleton` base ya lo incluye.

## Testing

Para testing, puedes mockear el estado de carga:

```tsx
import { render } from "@testing-library/react";
import { SkeletonOrdersList } from "@/components/common";

test("muestra skeleton mientras carga", () => {
  const { getByLabelText } = render(<SkeletonOrdersList />);
  expect(getByLabelText("Cargando")).toBeInTheDocument();
});
```

## Changelog

### v1.0 (2026-10-26)
- ✅ 15 componentes skeleton especializados
- ✅ LoadingState con 4 variantes
- ✅ Integración con TanStack Query
- ✅ Accesibilidad completa
- ✅ Animación shimmer global
