import {
  ArrowLeftRight,
  Bell,
  Bot,
  BookOpen,
  Boxes,
  Building2,
  Circle,
  Coins,
  Columns3,
  Fuel,
  Gavel,
  PackageCheck,
  Scale,
  Warehouse,
  Undo2,
  Zap,
  Gauge,
  Handshake,
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  CalendarDays,
  ChartLine,
  ClipboardList,
  Cylinder,
  FileClock,
  Flame,
  FolderOpen,
  HardHat,
  Briefcase,
  IdCard,
  HandCoins,
  House,
  MapPinHouse,
  ListChecks,
  Map as MapIcon,
  MessageSquareWarning,
  Navigation,
  ReceiptText,
  ServerCog,
  Settings,
  SlidersHorizontal,
  Timer,
  ShieldCheck,
  Star,
  TriangleAlert,
  Truck,
  UserRound,
  Users,
  Landmark,
  Percent,
  Tags,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  /** Muestra al lado la cantidad de pedidos esperando chofer. */
  showPendingOrders?: boolean;
  /** Sin esto lo ve cualquier sesión autenticada (admin o super_admin). */
  superAdminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * El menú del panel, agrupado por sección. `SideMenu` filtra `superAdminOnly`
 * según el rol; el resto lo ve cualquiera que haya podido entrar (admin o
 * super_admin: son los únicos roles que pasan `useCheckAuth`).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operación',
    items: [
      { title: 'Tablero', path: '/home', icon: House },
      { title: 'Pedidos', path: '/orders', icon: ReceiptText, showPendingOrders: true },
      { title: 'Tablero de despacho', path: '/orders/dispatch', icon: Columns3 },
      { title: 'Cobros impagos', path: '/unpaid-collections', icon: HandCoins },
      { title: 'Reintegros', path: '/refunds', icon: Undo2 },
      { title: 'Reservas', path: '/reservations', icon: CalendarDays },
      { title: 'Seguimiento en vivo', path: '/tracking', icon: Navigation },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { title: 'Clientes', path: '/customers', icon: Users },
      { title: 'Direcciones', path: '/addresses', icon: MapPinHouse, superAdminOnly: true },
    ],
  },
  {
    title: 'Personal',
    items: [
      { title: 'Choferes', path: '/deliveries', icon: HardHat },
      { title: 'Calificaciones', path: '/ratings', icon: Star },
      { title: 'Legajos', path: '/employees', icon: IdCard },
      { title: 'Puestos', path: '/employees/positions', icon: Briefcase },
      { title: 'Asistencia', path: '/attendance', icon: CalendarCheck },
      { title: 'Licencias', path: '/leaves', icon: CalendarOff },
    ],
  },
  {
    title: 'Flota',
    items: [
      { title: 'Vehículos', path: '/cars', icon: Truck },
      { title: 'Planes', path: '/fleet/plans', icon: ClipboardList },
      { title: 'Tareas', path: '/fleet/tasks', icon: ListChecks },
      { title: 'Vencimientos', path: '/fleet/expirations', icon: CalendarClock },
      { title: 'Combustible', path: '/fleet/fuel-loads', icon: Fuel },
      { title: 'Multas', path: '/fleet/fines', icon: Gavel },
      { title: 'Siniestros', path: '/fleet/accidents', icon: TriangleAlert },
      { title: 'Neumáticos', path: '/fleet/tires', icon: Circle },
      { title: 'Costos', path: '/fleet/costs', icon: Gauge },
      { title: 'Archivos', path: '/fleet/files', icon: FolderOpen },
    ],
  },
  {
    title: 'Stock y compras',
    items: [
      { title: 'Resumen de stock', path: '/stock', icon: Boxes },
      { title: 'Galpones', path: '/stock/warehouses', icon: Warehouse },
      { title: 'Ajustes', path: '/stock/adjustments', icon: ClipboardList },
      { title: 'Transferencias', path: '/stock/transfers', icon: ArrowLeftRight },
      { title: 'Libro de movimientos', path: '/stock/movements', icon: BookOpen },
      { title: 'Mínimos', path: '/stock/thresholds', icon: Gauge },
      { title: 'Conciliación', path: '/stock/reconciliation', icon: Scale },
      { title: 'Proveedores', path: '/purchases/suppliers', icon: Handshake },
      { title: 'Órdenes de compra', path: '/purchases/orders', icon: ReceiptText },
      { title: 'Recepciones', path: '/purchases/receipts', icon: PackageCheck },
      { title: 'Costo promedio', path: '/purchases/costs', icon: Coins },
      { title: 'Cargas del camión', path: '/truck-loads', icon: Truck },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { title: 'Tablero', path: '/finance', icon: Gauge },
      { title: 'Cajas', path: '/finance/boxes', icon: Wallet },
      { title: 'Movimientos', path: '/finance/movements', icon: BookOpen },
      { title: 'Categorías', path: '/finance/categories', icon: Tags },
      { title: 'Rendiciones', path: '/finance/settlements', icon: HandCoins },
      { title: 'Cuentas corrientes', path: '/finance/accounts', icon: Landmark },
      { title: 'Comisiones', path: '/finance/commissions', icon: Percent },
      { title: 'Reglas de comisión', path: '/finance/commission-rules', icon: SlidersHorizontal },
      { title: 'Liquidaciones', path: '/finance/liquidations', icon: ReceiptText },
    ],
  },
  {
    title: 'Catálogo y cobertura',
    items: [
      { title: 'Garrafas', path: '/cylinders', icon: Flame },
      { title: 'Envases', path: '/physical-cylinders', icon: Cylinder },
      { title: 'Zonas de cobertura', path: '/coverage-zones', icon: MapIcon },
      { title: 'Configuración', path: '/settings', icon: Settings },
      { title: 'Parámetros del despacho', path: '/settings/dispatch', icon: SlidersHorizontal },
      { title: 'Tareas programadas', path: '/settings/scheduled-tasks', icon: Timer },
      { title: 'Procesos automáticos', path: '/settings/automatic-processes', icon: Bot },
      { title: 'Compra express', path: '/settings/express', icon: Zap },
    ],
  },
  {
    title: 'Posventa',
    items: [
      { title: 'Reclamos', path: '/claims', icon: MessageSquareWarning },
      { title: 'Incidencias', path: '/incidents', icon: TriangleAlert },
    ],
  },
  {
    title: 'Administración',
    items: [
      { title: 'Usuarios', path: '/users', icon: UserRound },
      { title: 'Administradores', path: '/admins', icon: ShieldCheck },
      { title: 'Distribuidoras', path: '/distributors', icon: Building2, superAdminOnly: true },
      { title: 'Notificaciones', path: '/notifications', icon: Bell },
      { title: 'Auditoría', path: '/audit', icon: FileClock },
      { title: 'Reportes', path: '/reports', icon: ChartLine },
      { title: 'Sistema', path: '/system', icon: ServerCog, superAdminOnly: true },
    ],
  },
];
