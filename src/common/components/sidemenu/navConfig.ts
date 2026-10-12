import {
  ArrowLeftRight,
  BookOpen,
  Boxes,
  Building2,
  Coins,
  PackageCheck,
  Scale,
  Warehouse,
  Gauge,
  Handshake,
  CalendarClock,
  CalendarDays,
  ChartLine,
  ClipboardList,
  Cylinder,
  FileClock,
  Flame,
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
  ShieldCheck,
  Star,
  TriangleAlert,
  Truck,
  UserRound,
  Users,
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
      { title: 'Cobros impagos', path: '/unpaid-collections', icon: HandCoins },
      { title: 'Reservas', path: '/reservations', icon: CalendarDays },
      { title: 'Seguimiento en vivo', path: '/tracking', icon: Navigation },
    ],
  },
  {
    title: 'Clientes y flota',
    items: [
      { title: 'Clientes', path: '/customers', icon: Users },
      { title: 'Choferes', path: '/deliveries', icon: HardHat },
      { title: 'Legajos', path: '/employees', icon: IdCard },
      { title: 'Puestos', path: '/employees/positions', icon: Briefcase },
      { title: 'Vehículos', path: '/cars', icon: Truck },
      { title: 'Vencimientos', path: '/fleet/expirations', icon: CalendarClock },
      { title: 'Planes de flota', path: '/fleet/plans', icon: ClipboardList },
      { title: 'Tareas de flota', path: '/fleet/tasks', icon: ListChecks },
      { title: 'Calificaciones', path: '/ratings', icon: Star },
      { title: 'Direcciones', path: '/addresses', icon: MapPinHouse, superAdminOnly: true },
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
    title: 'Catálogo y cobertura',
    items: [
      { title: 'Garrafas', path: '/cylinders', icon: Flame },
      { title: 'Envases', path: '/physical-cylinders', icon: Cylinder },
      { title: 'Zonas de cobertura', path: '/coverage-zones', icon: MapIcon },
      { title: 'Configuración', path: '/settings', icon: Settings },
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
      { title: 'Auditoría', path: '/audit', icon: FileClock },
      { title: 'Reportes', path: '/reports', icon: ChartLine },
      { title: 'Sistema', path: '/system', icon: ServerCog, superAdminOnly: true },
    ],
  },
];
