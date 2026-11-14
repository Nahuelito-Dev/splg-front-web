import {
  Activity,
  ArrowLeftRight,
  Bell,
  Bot,
  BookOpen,
  Boxes,
  Building2,
  Circle,
  Coins,
  CreditCard,
  Columns3,
  Fuel,
  Gavel,
  PackageCheck,
  PackageSearch,
  ArrowDownUp,
  Scale,
  ScanText,
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
  LifeBuoy,
  ListChecks,
  Map as MapIcon,
  MessageSquareWarning,
  Navigation,
  ReceiptText,
  Repeat,
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
  Tags,
  Wallet,
  type LucideIcon,
  Waypoints,
  Wrench,
  Route as RouteIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  /** Muestra al lado la cantidad de pedidos esperando chofer. */
  showPendingOrders?: boolean;
  /**
   * Alcance de la pantalla (§2 del diseño del modo soporte). Sin esto es de **empresa**: la ven el admin de la empresa y
   * el administrador general sólo en modo soporte. `platform`: sólo el administrador general fuera del modo soporte.
   * `both`: existe para los dos, con el contenido de quien mira.
   */
  scope?: 'platform' | 'both';
  /** Permiso F37 que necesita el admin de la empresa para verla. */
  permission?: string;
  /** Sólo el admin de la empresa (la API se la niega al administrador general aun en modo soporte). */
  companyAdminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** El menú del panel, agrupado por sección. Quién ve cada ítem lo decide `isNavItemVisible` (navScope). */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operación',
    items: [
      { title: 'Tablero', path: '/home', icon: House, scope: 'both' },
      { title: 'Pedidos', path: '/orders', icon: ReceiptText, showPendingOrders: true },
      { title: 'Tablero de despacho', path: '/orders/dispatch', icon: Columns3 },
      { title: 'Seguimiento en vivo', path: '/tracking', icon: Navigation },
      { title: 'Recorridos', path: '/route-batches', icon: RouteIcon },
      { title: 'Hojas de ruta', path: '/route-sheets', icon: Waypoints, permission: 'despacho.gestionar' },
      { title: 'Reservas', path: '/reservations', icon: CalendarDays },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { title: 'Clientes', path: '/customers', icon: Users },
      { title: 'Recompra', path: '/customers/repurchase', icon: Repeat },
      { title: 'Reclamos', path: '/claims', icon: MessageSquareWarning },
      { title: 'Incidencias', path: '/incidents', icon: TriangleAlert },
    ],
  },
  {
    title: 'Garrafas y envases',
    items: [
      { title: 'Garrafas', path: '/cylinders', icon: Flame },
      { title: 'Envases', path: '/physical-cylinders', icon: Cylinder },
      { title: 'Recupero de envases', path: '/physical-cylinders/recovery', icon: PackageSearch },
    ],
  },
  {
    title: 'Stock',
    items: [
      { title: 'Resumen de stock', path: '/stock', icon: Boxes },
      { title: 'Cargas del camión', path: '/truck-loads', icon: Truck },
      { title: 'Galpones', path: '/stock/warehouses', icon: Warehouse },
      { title: 'Libro de movimientos', path: '/stock/movements', icon: BookOpen },
      { title: 'Transferencias', path: '/stock/transfers', icon: ArrowLeftRight },
      { title: 'Ajustes', path: '/stock/adjustments', icon: ClipboardList },
      { title: 'Mínimos', path: '/stock/thresholds', icon: Gauge },
      { title: 'Conciliación', path: '/stock/reconciliation', icon: Scale },
    ],
  },
  {
    title: 'Compras',
    items: [
      { title: 'Órdenes de compra', path: '/purchases/orders', icon: ReceiptText },
      { title: 'Recepciones', path: '/purchases/receipts', icon: PackageCheck },
      { title: 'Proveedores', path: '/purchases/suppliers', icon: Handshake },
      { title: 'Costo promedio', path: '/purchases/costs', icon: Coins },
    ],
  },
  {
    title: 'Flota',
    items: [
      { title: 'Vehículos', path: '/cars', icon: Truck },
      { title: 'Vencimientos', path: '/fleet/expirations', icon: CalendarClock },
      { title: 'Tareas', path: '/fleet/tasks', icon: ListChecks },
      { title: 'Planes', path: '/fleet/plans', icon: ClipboardList },
      { title: 'Planificador de taller', path: '/fleet/planner', icon: Wrench },
      { title: 'Combustible', path: '/fleet/fuel-loads', icon: Fuel },
      { title: 'Neumáticos', path: '/fleet/tires', icon: Circle },
      { title: 'Multas', path: '/fleet/fines', icon: Gavel },
      { title: 'Siniestros', path: '/fleet/accidents', icon: TriangleAlert },
      { title: 'Aseguradoras', path: '/fleet/insurers', icon: ShieldCheck },
      { title: 'Costos', path: '/fleet/costs', icon: Gauge },
      { title: 'Archivos', path: '/fleet/files', icon: FolderOpen },
    ],
  },
  {
    title: 'Personal',
    items: [
      { title: 'Choferes', path: '/deliveries', icon: HardHat },
      { title: 'Legajos', path: '/employees', icon: IdCard },
      { title: 'Asistencia', path: '/attendance', icon: CalendarCheck },
      { title: 'Licencias', path: '/leaves', icon: CalendarOff },
      { title: 'Puestos', path: '/employees/positions', icon: Briefcase },
      { title: 'Calificaciones', path: '/ratings', icon: Star },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { title: 'Tablero', path: '/finance', icon: Gauge },
      { title: 'Cajas', path: '/finance/boxes', icon: Wallet },
      { title: 'Movimientos', path: '/finance/movements', icon: BookOpen },
      { title: 'Ingresos y egresos', path: '/finance/income-statement', icon: ArrowDownUp },
      { title: 'Cobros impagos', path: '/unpaid-collections', icon: HandCoins },
      { title: 'Reintegros', path: '/refunds', icon: Undo2 },
      { title: 'Rendiciones', path: '/finance/settlements', icon: HandCoins },
      { title: 'Cuentas corrientes', path: '/finance/accounts', icon: Landmark },
      { title: 'Conciliación MP', path: '/finance/mp-reconciliation', icon: ArrowLeftRight },
      { title: 'Cajas de cobro', path: '/finance/collection-settings', icon: CreditCard },
      { title: 'Categorías', path: '/finance/categories', icon: Tags },
    ],
  },
  {
    title: 'Administración',
    items: [
      { title: 'Reportes', path: '/reports', icon: ChartLine },
      { title: 'Lectura de documentos', path: '/document-readings', icon: ScanText },
      { title: 'Notificaciones', path: '/notifications', icon: Bell, scope: 'both' },
      { title: 'Usuarios', path: '/users', icon: UserRound, scope: 'both' },
      { title: 'Administradores', path: '/admins', icon: ShieldCheck, scope: 'both' },
      { title: 'Auditoría', path: '/audit', icon: FileClock, scope: 'both' },
      {
        title: 'Accesos de soporte',
        path: '/support-access',
        icon: LifeBuoy,
        permission: 'soporte.ver',
        companyAdminOnly: true,
      },
      { title: 'Distribuidoras', path: '/distributors', icon: Building2, scope: 'platform' },
      { title: 'Sistema', path: '/system', icon: ServerCog, scope: 'platform' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { title: 'Configuración general', path: '/settings', icon: Settings },
      { title: 'Zonas de cobertura', path: '/coverage-zones', icon: MapIcon },
      { title: 'Parámetros del despacho', path: '/settings/dispatch', icon: SlidersHorizontal },
      { title: 'Compra express', path: '/settings/express', icon: Zap },
      { title: 'Procesos automáticos', path: '/settings/automatic-processes', icon: Bot },
      { title: 'Tareas programadas', path: '/settings/scheduled-tasks', icon: Timer },
      { title: 'Monitoreo de procesos', path: '/settings/process-monitor', icon: Activity, scope: 'both' },
    ],
  },
];
