// Tipos exactos de docs/API_CONTRACT.md (única fuente de verdad).

export type Role = "ADMIN" | "CASHIER" | "WAITER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  restaurantId: string;
  restaurantName: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface SuccessResponse {
  success: true;
  deactivated?: boolean;
}

// ---------- Restaurante ----------
export interface Restaurant {
  id: string;
  name: string;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  taxRate: number;
  pricesIncludeTax: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRestaurantInput {
  name?: string;
  ruc?: string;
  address?: string;
  phone?: string;
  taxRate?: number;
  pricesIncludeTax?: boolean;
}

// ---------- Usuarios ----------
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  isActive?: boolean;
}

// ---------- Áreas y mesas ----------
export interface Area {
  id: string;
  name: string;
  tablesCount: number;
  createdAt: string;
}

/** Solo Libre / Ocupada. El estado lo maneja el pedido (OCCUPIED al abrir, AVAILABLE al cobrar). */
export type TableStatus = "AVAILABLE" | "OCCUPIED";

export interface TableActiveOrder {
  id: string;
  number: number;
  /** null en pedidos antiguos: mostrar "Sin nombre". */
  customerName: string | null;
  status: OrderStatus;
  total: number;
  itemsCount: number;
  createdAt: string;
}

export interface Table {
  id: string;
  name: string;
  seats: number | null;
  areaId: string;
  areaName: string;
  status: TableStatus;
  activeOrder: TableActiveOrder | null;
}

export interface TableMapArea {
  id: string;
  name: string;
  tables: Table[];
}

export interface CreateTableInput {
  name: string;
  areaId: string;
  seats?: number;
}

export interface UpdateTableInput {
  name?: string;
  areaId?: string;
  seats?: number;
}

// ---------- Productos ----------
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  taxable: boolean;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
  taxable: boolean;
  available?: boolean;
}

// ---------- Pedidos ----------
/** Solo OPEN → PAID. CANCELLED aparece únicamente en datos históricos. */
export type OrderStatus = "OPEN" | "PAID" | "CANCELLED";

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  taxable: boolean;
  subtotal: number;
  notes: string | null;
}

export type PaymentMethod = "CASH" | "TRANSFER";

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  createdAt: string;
}

export interface Sale {
  id: string;
  orderId: string;
  cashRegisterId: string;
  userId: string;
  userName: string;
  subtotal: number;
  tax: number;
  total: number;
  cashAmount: number;
  transferAmount: number;
  payments: Payment[];
  createdAt: string;
}

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  tableId: string | null;
  tableName: string | null;
  areaName: string | null;
  userId: string;
  userName: string;
  customerName: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  items: OrderItem[];
  sale: Sale | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  tableId?: string;
  /** Requerido, 1–80 caracteres (se recorta). */
  customerName: string;
  notes?: string;
  items: OrderItemInput[];
}

export interface UpdateOrderInput {
  customerName?: string;
  notes?: string;
}

export interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface OrdersQuery {
  status?: OrderStatus;
  from?: string;
  to?: string;
  tableId?: string;
}

// ---------- Caja ----------
export type CashRegisterStatus = "OPEN" | "CLOSED";
export type MovementType = "INCOME" | "EXPENSE";

export interface PersonRef {
  id: string;
  name: string;
}

export interface CashMovement {
  id: string;
  type: MovementType;
  amount: number;
  reason: string;
  userName: string;
  createdAt: string;
}

export interface CashTransfer {
  id: string;
  orderNumber: number;
  amount: number;
  reference: string;
  createdAt: string;
}

export interface CashSaleListItem {
  id: string;
  orderId: string;
  orderNumber: number;
  customerName: string | null;
  tableName: string | null;
  total: number;
  cash: number;
  transfer: number;
  createdAt: string;
}

export interface CashRegisterSummary {
  id: string;
  status: CashRegisterStatus;
  openedAt: string;
  closedAt: string | null;
  openedBy: PersonRef;
  closedBy: PersonRef | null;
  notes: string | null;
  closingNotes: string | null;
  initialAmount: number;
  sales: { count: number; subtotal: number; tax: number; total: number; cash: number; transfer: number };
  incomes: number;
  expenses: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  movements: CashMovement[];
  transfers: CashTransfer[];
  salesList: CashSaleListItem[];
  restaurant: { name: string; ruc: string | null; address: string | null; phone: string | null };
}

export interface CashRegisterListItem {
  id: string;
  status: CashRegisterStatus;
  openedAt: string;
  closedAt: string | null;
  openedBy: PersonRef;
  closedBy: PersonRef | null;
  initialAmount: number;
  salesTotal: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
}

// ---------- Reportes ----------
export interface SalesReport {
  from: string;
  to: string;
  totals: {
    count: number;
    subtotal: number;
    tax: number;
    total: number;
    cash: number;
    transfer: number;
    averageTicket: number;
  };
  byDay: { date: string; count: number; total: number; cash: number; transfer: number }[];
  byWeek: { weekStart: string; weekEnd: string; count: number; total: number; cash: number; transfer: number }[];
  topProducts: { productId: string; name: string; quantity: number; total: number }[];
  byUser: { userId: string; name: string; count: number; total: number }[];
  sales: {
    id: string;
    orderId: string;
    orderNumber: number;
    customerName: string | null;
    tableName: string | null;
    userName: string;
    total: number;
    cash: number;
    transfer: number;
    createdAt: string;
  }[];
}

// ---------- Impresoras ----------
export type PrinterConnection = "BLUETOOTH" | "NETWORK" | "USB";
export type PrinterPurpose = "CASHIER" | "KITCHEN" | "BAR";
export type PaperWidth = 58 | 80;

export interface Printer {
  id: string;
  name: string;
  connectionType: PrinterConnection;
  address: string | null;
  paperWidth: PaperWidth;
  purpose: PrinterPurpose;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface PrinterInput {
  name: string;
  connectionType: PrinterConnection;
  address?: string;
  paperWidth: PaperWidth;
  purpose: PrinterPurpose;
  isDefault?: boolean;
  isActive?: boolean;
}

// ---------- Tiempo real ----------
export interface CashUpdatedEvent {
  registerId: string;
  status: CashRegisterStatus;
}

export interface RealtimeEvents {
  "table.updated": Table;
  "order.created": Order;
  "order.updated": Order;
  "cash.updated": CashUpdatedEvent;
}
