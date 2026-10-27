# Sistema de Diseño - Triada POS

## Paleta de Colores

### Colores Primarios
- **Primary (Morado Triada)**: `oklch(0.541 0.247 293)` - Color de marca principal
- **Background**: `oklch(0.982 0.004 286)` - Fondo claro
- **Foreground**: `oklch(0.21 0.02 285)` - Texto principal

### Colores Funcionales
- **Success**: `oklch(0.65 0.15 145)` - Verde para confirmaciones
- **Warning**: `oklch(0.75 0.15 70)` - Amarillo para alertas
- **Info**: `oklch(0.60 0.15 240)` - Azul para información
- **Error**: `oklch(0.577 0.245 27.325)` - Rojo para errores

### Colores de Estado (Pedidos/Mesas)
- **Available (Disponible)**: Verde - `bg-emerald-100 text-emerald-800`
- **Occupied (Ocupada)**: Amarillo - `bg-amber-100 text-amber-800`
- **Reserved (Reservada)**: Azul cielo - `bg-sky-100 text-sky-800`
- **Pending (Pendiente)**: Gris - `bg-gray-100 text-gray-800`

## Sistema de Espaciado

### Variables CSS
```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 0.75rem;   /* 12px */
--spacing-lg: 1rem;      /* 16px */
--spacing-xl: 1.5rem;    /* 24px */
--spacing-2xl: 2rem;     /* 32px */
--spacing-3xl: 2.5rem;   /* 40px */
--spacing-4xl: 3rem;     /* 48px */
```

### Uso en Componentes
- **Padding interno pequeño**: `p-3` (12px)
- **Padding interno medio**: `p-4` (16px)
- **Padding interno grande**: `p-6` (24px)
- **Gap entre elementos**: `gap-3` (12px) o `gap-4` (16px)
- **Separación de secciones**: `space-y-6` (24px)

## Tipografía

### Jerarquía de Tamaños
- **Hero (Dashboard)**: `text-4xl` (2.5rem / 40px) - `font-bold`
- **Títulos principales**: `text-3xl` (2rem / 32px) - `font-semibold`
- **Títulos sección**: `text-2xl` (1.5rem / 24px) - `font-semibold`
- **Subtítulos**: `text-lg` (1.125rem / 18px) - `font-medium`
- **Cuerpo**: `text-base` (1rem / 16px) - `font-normal`
- **Pequeño**: `text-sm` (0.875rem / 14px) - `font-normal`
- **Tiny**: `text-xs` (0.75rem / 12px) - `font-normal`

### Fuentes
- **UI**: Geist Sans (Variable: `--font-geist-sans`)
- **Código/Números**: Geist Mono (Variable: `--font-geist-mono`)

## Componentes

### Cards

#### Card Básico
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenido */}
  </CardContent>
</Card>
```

#### Card Interactivo (con hover)
```tsx
<div className="card-interactive">
  {/* Contenido clickeable */}
</div>
```

#### Card Elevado
```tsx
<div className="card-elevated">
  {/* Contenido con sombra permanente */}
</div>
```

### Badges de Estado

#### Badge Personalizado
```tsx
<span className="status-badge status-success">
  <span className="status-dot status-dot-success" />
  Disponible
</span>
```

#### Variantes Disponibles
- `status-available` - Verde (mesas/productos disponibles)
- `status-occupied` - Amarillo (mesas ocupadas)
- `status-reserved` - Azul (mesas reservadas)
- `status-success` - Verde (operaciones exitosas)
- `status-warning` - Amarillo (alertas)
- `status-error` - Rojo (errores)
- `status-info` - Azul (información)
- `status-pending` - Gris (pendiente)

### Botones

#### Botón Primario
```tsx
<Button className="action-button-primary">
  <Icon /> Acción Principal
</Button>
```

#### Botón Secundario
```tsx
<Button className="action-button-secondary">
  <Icon /> Acción Secundaria
</Button>
```

### Inputs con Validación

#### Input con Éxito
```tsx
<Input className="input-success" />
```

#### Input con Error
```tsx
<Input className="input-error" />
```

#### Input con Advertencia
```tsx
<Input className="input-warning" />
```

## Sombras

### Variables CSS
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

### Clases de Utilidad
- `shadow-soft` - Sombra muy sutil
- `shadow-card` - Sombra para cards
- `shadow-card-hover` - Sombra para cards en hover

## Animaciones

### Transiciones
- `transition-smooth` - Transición suave para todas las propiedades
- `transition-colors-smooth` - Transición suave solo para colores

### Animaciones de Entrada/Salida
- `animate-in` - Slide in desde arriba
- `animate-out` - Slide out hacia arriba

### Loading States
```tsx
<div className="loading-shimmer h-20 w-full rounded-lg" />
```

## Radio de Bordes

### Variables CSS
```css
--radius-sm: 0.45rem;  /* 7.2px */
--radius-md: 0.6rem;   /* 9.6px */
--radius-lg: 0.75rem;  /* 12px - Default */
--radius-xl: 1.05rem;  /* 16.8px */
--radius-2xl: 1.35rem; /* 21.6px */
```

### Uso Recomendado
- **Botones pequeños**: `rounded-md`
- **Botones regulares**: `rounded-lg`
- **Cards**: `rounded-xl`
- **Modales**: `rounded-2xl`
- **Pills/Badges**: `rounded-full`

## Grids Responsivos

### Auto-fit (ajusta columnas automáticamente)
```tsx
<div className="grid-auto-fit">
  {items.map(item => <Card key={item.id}>{item.content}</Card>)}
</div>
```

### Auto-fill (llena con columnas automáticamente)
```tsx
<div className="grid-auto-fill">
  {items.map(item => <Card key={item.id}>{item.content}</Card>)}
</div>
```

## Breakpoints

### Tailwind Defaults
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Uso Recomendado
- **Móvil**: Base (sin prefijo)
- **Tablet**: `md:` (768px+)
- **Desktop**: `lg:` (1024px+)
- **Desktop Grande**: `xl:` (1280px+)

## Accesibilidad

### Focus Ring
Siempre usa `focus-ring` en elementos interactivos:
```tsx
<button className="focus-ring">
  Botón Accesible
</button>
```

### Skip Links
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Saltar al contenido principal
</a>
```

### Live Regions
```tsx
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {liveMessage}
</div>
```

## Modo Oscuro

El sistema soporta modo oscuro automáticamente. Todos los colores tienen variantes dark definidas.

### Toggle Manual (próximamente)
```tsx
import { useTheme } from "next-themes"

const { theme, setTheme } = useTheme()
```

## Mejores Prácticas

### 1. Consistencia
- Usa siempre las variables CSS en lugar de valores hardcodeados
- Mantén consistencia en espaciado (múltiplos de 4px)
- Usa la jerarquía de tipografía definida

### 2. Performance
- Prefiere `transition-colors` sobre `transition-all` cuando sea posible
- Usa `will-change` con moderación
- Optimiza animaciones con `transform` y `opacity`

### 3. Accesibilidad
- Siempre incluye `aria-label` en iconos sin texto
- Usa `focus-ring` en todos los elementos interactivos
- Mantén contraste WCAG AA (4.5:1 para texto normal)

### 4. Responsive
- Diseña mobile-first (base sin prefijo)
- Usa breakpoints consistentemente
- Evita `hidden` en móvil si es contenido importante

### 5. Números y Monedas
- Usa `tabular-nums` para alineación de números
- Formato de moneda: `money()` helper function
- Siempre muestra 2 decimales en montos

## Recursos

- **Iconos**: Lucide React ([lucide.dev](https://lucide.dev))
- **Componentes**: shadcn/ui sobre Base UI
- **Colores**: OKLCH color space para mejor consistencia perceptual
- **Animaciones**: Tailwind CSS + custom keyframes

## Changelog

### v1.0 - Mejoras UX/UI (2026-10-26)
- ✅ Sistema de espaciado expandido
- ✅ Colores funcionales (success, warning, info, error)
- ✅ Sombras mejoradas con variables CSS
- ✅ Badges de estado personalizados
- ✅ Cards interactivos con hover
- ✅ Input states con validación visual
- ✅ Animaciones suaves y consistentes
- ✅ Scrollbar personalizado
- ✅ Utilities para grids responsivos
