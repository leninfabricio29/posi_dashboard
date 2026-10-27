# Guía de Accesibilidad - Triada POS

Esta guía documenta las mejoras de accesibilidad implementadas en el panel administrativo de Triada POS para cumplir con los estándares WCAG 2.1 Nivel AA.

## Resumen de Mejoras (Fase 5 - Task 10)

### 1. Skip Links
**Archivo:** `src/components/skip-links.tsx`

**Propósito:** Permite a usuarios de tecnología de asistencia saltar contenido repetitivo.

**Características:**
- Componente oculto que se muestra al recibir focus del teclado
- Enlaces rápidos a:
  - Contenido principal
  - Navegación lateral
  - Pie de página
- Estilos de foco visibles para navegación por teclado

**Estándar WCAG:** 2.4.1 Bypass Blocks

**Uso:**
```tsx
import { SkipLinks } from "@/components/skip-links";

export function Layout() {
  return (
    <>
      <SkipLinks />
      {/* contenido */}
    </>
  );
}
```

### 2. Focus Management & Focus Trap
**Archivo:** `src/hooks/use-focus-trap.ts`

**Propósito:** Asegura que el focus permanezca dentro de modales/diálogos y se restaure al cerrar.

**Hooks Disponibles:**

#### `useFocusTrap(containerRef, isActive)`
- Atrapa el focus dentro del contenedor
- Maneja Tab/Shift+Tab para circular el focus
- Enfoca el primer elemento al activarse

**Parámetros:**
- `containerRef`: Referencia al contenedor del modal
- `isActive`: Boolean para activar/desactivar la trampa

**Estándar WCAG:** 2.1.1 Keyboard, 2.4.3 Focus Order

**Ejemplo:**
```tsx
import { useFocusTrap } from "@/hooks/use-focus-trap";

function MyModal({ open }: { open: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);
  
  return <div ref={ref}>{/* contenido del modal */}</div>;
}
```

#### `useRestoreFocus(triggerRef, isOpen)`
- Restaura el focus al elemento que abrió el modal
- Se ejecuta automáticamente al cerrar

**Ejemplo:**
```tsx
const triggerRef = useRef<HTMLButtonElement>(null);
useRestoreFocus(triggerRef, isOpen);
```

### 3. Live Regions (ARIA Live)
**Archivo:** `src/components/live-regions.tsx`

**Propósito:** Anuncia cambios dinámicos a usuarios de lectores de pantalla.

**Componentes:**

#### `PoliteRegion`
- Anuncia cambios sin interrumpir el flujo de lectura
- Ideal para: validación de formularios, actualizaciones de estado

**Ejemplo:**
```tsx
<PoliteRegion id="status">
  {orderStatus}
</PoliteRegion>
```

#### `AssertiveRegion`
- Anuncia cambios inmediatamente
- Ideal para: errores críticos, alertas urgentes

**Ejemplo:**
```tsx
<AssertiveRegion id="errors">
  {error && `Error: ${error}`}
</AssertiveRegion>
```

#### Hook `useAnnounce()`
- Crea live regions dinámicamente
- Útil para anuncios fuera de componentes específicos

**Ejemplo:**
```tsx
const announce = useAnnounce();
announce("Pedido actualizado correctamente", "polite");
announce("Error de conexión", "assertive");
```

**Estándar WCAG:** 4.1.3 Status Messages

### 4. Atributos ARIA Mejorados

**En toda la aplicación:**
- `aria-label`: Etiquetas descriptivas para iconos y botones
- `aria-describedby`: Descripciones de campos de formulario
- `aria-current="page"`: Indica la página actual
- `aria-invalid`: Indica campos con error
- `aria-live`: Anuncios dinámicos
- `aria-hidden="true"`: Oculta decoraciones de lectores de pantalla
- `role`: Semántica ARIA para elementos sin semántica nativa

**Estándares WCAG:**
- 1.3.1 Info and Relationships
- 1.4.3 Contrast (Minimum)
- 4.1.2 Name, Role, Value

### 5. Accesibilidad de Formularios
**Archivo:** `src/components/accessible-form-field.tsx`

**Componente:** `AccessibleFormField`

**Características:**
- Asociación automática label-input con `htmlFor`
- Mensajes de error con `role="alert"`
- Hints/sugerencias asociadas con `aria-describedby`
- Indicadores visuales de campos requeridos
- Contraste mejorado en estados de error

**Ejemplo:**
```tsx
import { AccessibleFormField } from "@/components/accessible-form-field";

<AccessibleFormField
  id="email"
  label="Correo Electrónico"
  required
  error={errors.email}
  hint="Usaremos esto para notificaciones"
>
  <Input />
</AccessibleFormField>
```

**Helper:** `getFieldError(touched, error)`
```tsx
const error = getFieldError(formState.touched.email, formState.errors.email?.message);
```

### 6. Componentes Accesibles Mejorados

#### Command Palette (`src/components/command-palette.tsx`)
- `aria-label` en el diálogo
- `aria-describedby` con instrucciones
- `role="listbox"` en resultados
- `role="option"` en items
- `aria-live="polite"` para contar resultados
- Indicadores de teclado accesibles

#### App Sidebar (`src/components/app-sidebar.tsx`)
- `aria-label` en nav
- `role="navigation"` explícito
- `aria-current="page"` para el item activo
- `aria-hidden="true"` en decoraciones
- Links con aria-label descriptivos

#### Bottom Navigation (`src/components/bottom-navigation.tsx`)
- `role="navigation"` en nav
- `role="menubar"` en items principales
- `aria-current="page"` para items activos
- `aria-expanded` en botón "Más"
- `aria-label` en badges con conteos
- Focus visible mejorado

### 7. Navegación por Teclado

**Atajos Globales (en `src/hooks/use-keyboard-shortcuts.ts`):**
- `Ctrl+K`: Abrir Command Palette
- `Ctrl+H`: Ir a Inicio
- `Ctrl+P`: Ir a Pedidos
- `Ctrl+C`: Ir a Caja
- `Ctrl+M`: Ir a Mesas
- `Ctrl+R`: Ir a Reportes
- `Ctrl+S`: Ir a Configuración
- `Ctrl+N`: Crear nuevo pedido
- `F5`: Recargar página

**Navegación Estándar:**
- `Tab`: Navegar entre elementos focusables
- `Shift+Tab`: Navegar hacia atrás
- `Enter/Space`: Activar botones y links
- `Escape`: Cerrar modales y diálogos

**En Command Palette:**
- `↑/↓`: Navegar entre resultados
- `Enter`: Seleccionar item
- `Escape`: Cerrar paleta

**Estándar WCAG:** 2.1.1 Keyboard, 2.4.7 Focus Visible

### 8. Mejoras de Contraste y Visibilidad

**En `src/app/globals.css`:**

#### Screen Reader Only
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  /* ... */
}

/* Mostrar cuando tiene focus (para navegación por teclado) */
.sr-only:focus-within,
.focus-within\:not-sr-only:focus-within {
  position: static;
  /* ... */
}
```

#### Focus Indicators Mejorados
```css
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

#### Soporte para Contraste Alto
```css
@media (prefers-contrast: more) {
  :root {
    --primary: oklch(0.4 0.25 293);
  }
}
```

#### Respeto de Preferencias de Movimiento
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Estándares WCAG:**
- 1.4.3 Contrast (Minimum)
- 1.4.11 Non-text Contrast
- 2.3.3 Animation from Interactions
- 2.5.4 Motion Actuation

### 9. Estructura Semántica

**Landmarks HTML5 con roles ARIA:**

```tsx
// Skip links
<SkipLinks />

// Header con role banner
<header id="sidebar" role="banner">
  {/* navegación */}
</header>

// Main content
<main id="main-content" role="main">
  {/* contenido principal */}
</main>

// Sidebar
<nav aria-label="Navegación principal">
  {/* menú */}
</nav>

// Bottom nav en móvil
<nav aria-label="Navegación móvil" role="navigation">
  {/* items */}
</nav>
```

**Estándar WCAG:** 1.3.1 Info and Relationships

### 10. Testing y Validación

**Herramientas Recomendadas:**
1. **WAVE** (WebAIM)
   - Detecta errores de accesibilidad
   - URL: https://wave.webaim.org/

2. **axe DevTools**
   - Análisis detallado de WCAG
   - Extensión para Chrome/Firefox

3. **Lighthouse** (Chrome DevTools)
   - Auditoría de accesibilidad integrada
   - Recomendaciones automáticas

4. **Lectores de Pantalla**
   - NVDA (Windows, gratis)
   - JAWS (Windows, comercial)
   - VoiceOver (macOS/iOS, integrado)
   - TalkBack (Android, integrado)

**Checklist de Testing:**
- [ ] Navegación completa con teclado
- [ ] Tab order correcto
- [ ] Focus visible en todos los elementos focusables
- [ ] Mensajes de error anunciados
- [ ] Textos alternativos en imágenes
- [ ] Contraste de colores suficiente
- [ ] Funcionalidad con lector de pantalla
- [ ] Respeta preferencias de movimiento
- [ ] Sin trampas de focus
- [ ] Skip links funcionando

## Integración en Componentes Existentes

### Layout Principal (`src/app/(panel)/layout.tsx`)
```tsx
<SidebarProvider>
  <SkipLinks />
  <AppSidebar />
  <CommandPalette open={...} onOpenChange={...} />
  <header id="sidebar" role="banner">
    {/* navegación */}
  </header>
  <main id="main-content" role="main">
    {children}
  </main>
  <BottomNavigation />
</SidebarProvider>
```

### Modales/Diálogos
```tsx
const ref = useRef<HTMLDivElement>(null);
useFocusTrap(ref, open);
useRestoreFocus(triggerRef, open);

return (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent ref={ref}>
      {/* contenido */}
    </DialogContent>
  </Dialog>
);
```

### Formularios
```tsx
<form>
  <AccessibleFormField
    id="fieldId"
    label="Label"
    error={errors.field}
    hint="Helper text"
    required
  >
    <Input />
  </AccessibleFormField>
</form>
```

## Estándares Cumplidos

### WCAG 2.1 Level A
- ✅ 1.3.1 Info and Relationships
- ✅ 2.1.1 Keyboard
- ✅ 2.4.1 Bypass Blocks
- ✅ 3.3.1 Error Identification
- ✅ 4.1.2 Name, Role, Value
- ✅ 4.1.3 Status Messages

### WCAG 2.1 Level AA
- ✅ 1.4.3 Contrast (Minimum)
- ✅ 1.4.11 Non-text Contrast
- ✅ 2.3.3 Animation from Interactions
- ✅ 2.4.3 Focus Order
- ✅ 2.4.7 Focus Visible
- ✅ 2.5.4 Motion Actuation
- ✅ 3.2.1 On Focus
- ✅ 3.3.4 Error Prevention

## Notas de Mantenimiento

1. **Nuevos Componentes:** Siempre añadir ARIA labels y roles apropiados
2. **Testing:** Usar herramientas de validación antes de mergear
3. **Colores:** Mantener ratio de contraste mínimo 4.5:1 para texto normal
4. **Focus:** Nunca remover outline sin reemplazarlo
5. **Animaciones:** Siempre respetar `prefers-reduced-motion`
6. **Imágenes:** Siempre incluir alt text descriptivo
7. **Links/Botones:** Siempre tener labels claros o aria-label

## Referencias

- [WCAG 2.1 Spec](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [The A11Y Project](https://www.a11yproject.com/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
