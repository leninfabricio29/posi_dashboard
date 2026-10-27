# Triada POS — Panel administrativo

Panel web (Next.js 15 + React 19 + Tailwind v4 + shadcn/ui) del POS del restaurante **Triada**.
Lo usan administradores y cajeros; los meseros usan la app móvil (el panel les bloquea el acceso).

El contrato con el backend (`api_posi`) está en [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) y es la **única fuente de verdad**.

## Cómo levantar

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # producción
npm run lint
npx tsc --noEmit
```

Requiere la API corriendo (por defecto en `http://localhost:4010`). Si la API no responde, cada vista muestra su estado de error con “Reintentar”.

## Variables de entorno

`.env.local`

| Variable | Valor por defecto | Uso |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | `http://localhost:4010` | URL base de la API REST y del Socket.IO (`/realtime`) |

## Funcionalidades

| Ruta | Roles | Qué hace |
|---|---|---|
| `/login` | — | Ingreso con correo y contraseña (bloquea rol WAITER) |
| `/inicio` | ADMIN, CASHIER | KPIs de hoy, estado de caja, pedidos activos, mapa de mesas en vivo |
| `/pedidos` | ADMIN, CASHIER | Crear pedidos (mesa o para llevar), agregar/quitar ítems, cambiar estado, cobrar (efectivo / transferencia / mixto con vuelto) |
| `/caja` | ADMIN, CASHIER | Apertura, ingresos/egresos, cierre con conteo por denominaciones, PDF de cierre, impresión térmica, historial |
| `/reportes` | ADMIN, CASHIER | Rango de fechas con calendario y presets, por día y por semana, top productos, por usuario, exportar PDF |
| `/mesas` | ADMIN | Áreas y mesas (CRUD) + mapa, reservar/liberar |
| `/productos` | ADMIN | CRUD de productos, switches “Grava IVA” y “Disponible” |
| `/usuarios` | ADMIN | CRUD de usuarios, rol, activar/desactivar, cambiar contraseña |
| `/impresoras` | ADMIN | CRUD de impresoras + prueba Bluetooth |
| `/configuracion` | ADMIN | Datos del restaurante, RUC, tasa de IVA, precios con IVA incluido |

## Estructura

```
src/
  app/
    layout.tsx               # metadata "Triada POS", lang="es", providers, Toaster
    page.tsx                 # redirige a /inicio o /login
    login/page.tsx
    (panel)/layout.tsx       # guard de sesión/rol + sidebar + header + RealtimeProvider
    (panel)/{inicio,pedidos,caja,reportes,mesas,productos,usuarios,impresoras,configuracion}/page.tsx
  components/
    ui/                      # componentes shadcn/ui (Base UI)
    auth-provider.tsx        # contexto de sesión (localStorage leído solo en useEffect)
    app-sidebar.tsx          # menú filtrado por rol
    common.tsx               # PageHeader, estados (carga/vacío/error), ConfirmDialog, SimpleSelect, indicador "En vivo"
    table-map.tsx            # mapa de mesas por estado
    date-pickers.tsx         # DatePicker y DateRangePicker con presets
    orders/                  # editor de pedido, detalle (sheet), cobro
    cash/                    # cierre de caja, acciones de reporte (PDF / térmica)
  hooks/
    use-async.ts             # carga de datos con loading/error/reload
    use-realtime.tsx         # Socket.IO (/realtime) + useRealtimeEvent + polling de respaldo (15 s)
  lib/
    api/client.ts            # fetch con Bearer, parseo seguro, errores del backend, refresh 401 deduplicado
    api/types.ts             # tipos exactos del contrato
    api/*.ts                 # un módulo por recurso
    pdf/                     # jsPDF + autotable: cierre de caja y reporte de ventas
    printing/                # Web Bluetooth + ESC/POS (prueba y cierre en térmica)
    format.ts, orders.ts, nav.ts, session.ts, utils.ts
```

## Tiempo real

`useRealtime` conecta a `${NEXT_PUBLIC_API_BASE}/realtime` con `auth: { token }` (el token se relee en cada reconexión).
Eventos: `table.updated` repinta el mapa, `order.created`/`order.updated` actualizan pedidos, `cash.updated` refresca la caja.
Si el socket no conecta, la UI sigue funcionando: el header muestra “Sin conexión” y mapa/pedidos/caja hacen polling cada 15 s.

## Impresión térmica Bluetooth (Web Bluetooth)

- Solo **Google Chrome / Microsoft Edge** (escritorio o Android). Firefox y Safari no soportan Web Bluetooth.
- Requiere **https** o `http://localhost`. En una IP de la red local (`http://192.168.x.x`) el navegador lo bloquea; usa https o, en Chrome, `chrome://flags/#unsafely-treat-insecure-origin-as-secure`.
- “Conectar y probar” abre el selector (`acceptAllDevices`) con los servicios BLE comunes de impresoras térmicas
  (`18f0`, `e7810a71-…`, `49535343-…`, `ff00`), busca una característica con `write`/`writeWithoutResponse`
  y envía ESC/POS en bloques de 180 bytes. El texto se normaliza a ASCII (sin tildes) por compatibilidad.
- La última impresora conectada se recuerda durante la sesión del navegador; desde Caja se usa para “Imprimir en térmica”
  con el ancho de papel (58/80 mm) de la impresora de caja predeterminada registrada en `/impresoras`.
- Las impresoras Bluetooth “clásicas” (SPP, no BLE) no son visibles para Web Bluetooth.
