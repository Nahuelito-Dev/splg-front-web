import {
  Activity,
  ArrowLeftRight,
  Bell,
  Bot,
  BotMessageSquare,
  BookOpen,
  Boxes,
  Blocks,
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
  Headset,
  Briefcase,
  IdCard,
  KeyRound,
  HandCoins,
  House,
  LifeBuoy,
  MessageCircleQuestion,
  MessagesSquare,
  MessageSquareText,
  Ticket,
  ListChecks,
  Map as MapIcon,
  MessageSquareWarning,
  Navigation,
  ReceiptText,
  Repeat,
  ServerCog,
  Palette,
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
import type { ModuleKey } from '../../../services/api/modules';

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
  /** Alcanza con uno de estos permisos F37 (p. ej. «Mensajes»: clientes o choferes). */
  anyPermission?: string[];
  /** Insignia con lo sin leer de la bandeja de la empresa (clientes y choferes). */
  inboxBadge?: boolean;
  /** Sólo el admin de la empresa (la API se la niega al administrador general aun en modo soporte). */
  companyAdminOnly?: boolean;
  /**
   * Módulo de la plataforma del que es la pantalla (DISENO-PLATAFORMA-ORIXTECH §6.5): si no está habilitado para la
   * empresa que se mira, el ítem no se muestra. Sin esto es núcleo.
   */
  module?: ModuleKey;
  /** Insignia con lo sin leer del chat con la plataforma: todo (empresa), los chats o los tickets (plataforma). */
  supportBadge?: 'all' | 'chats' | 'tickets';
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
      { title: 'Tablero', path: '/home', icon: House },
      { title: 'Pedidos', path: '/orders', icon: ReceiptText, showPendingOrders: true },
      { title: 'Tablero de despacho', path: '/orders/dispatch', icon: Columns3 },
      { title: 'Seguimiento en vivo', path: '/tracking', icon: Navigation },
      { title: 'Recorridos', path: '/route-batches', icon: RouteIcon, module: 'route_batching' },
      {
        title: 'Hojas de ruta',
        path: '/route-sheets',
        icon: Waypoints,
        permission: 'despacho.gestionar',
        module: 'route_planning',
      },
      { title: 'Reservas', path: '/reservations', icon: CalendarDays },
    ],
  },
  {
    // El menú del administrador general fuera del modo soporte (§3.4 del diseño de la plataforma), en ese orden.
    title: 'Plataforma',
    items: [
      { title: 'Tablero', path: '/home', icon: House, scope: 'platform' },
      { title: 'Distribuidoras', path: '/distributors', icon: Building2, scope: 'platform' },
      {
        title: 'Chat con empresas',
        path: '/platform/chats',
        icon: MessagesSquare,
        scope: 'platform',
        supportBadge: 'chats',
      },
      { title: 'Tickets', path: '/platform/tickets', icon: Ticket, scope: 'platform', supportBadge: 'tickets' },
      { title: 'Tablero de soporte', path: '/platform/support-metrics', icon: ChartLine, scope: 'platform' },
      { title: 'Módulos', path: '/platform/modules', icon: Blocks, scope: 'platform' },
      { title: 'Sesiones de soporte', path: '/platform/support-sessions', icon: Headset, scope: 'platform' },
      { title: 'Monitoreo', path: '/platform/monitoring', icon: Activity, scope: 'platform' },
      { title: 'Tareas programadas', path: '/platform/scheduled-tasks', icon: Timer, scope: 'platform' },
      { title: 'Uso y costo de servicios', path: '/platform/service-usage', icon: ScanText, scope: 'platform' },
      { title: 'Auditoría de plataforma', path: '/platform/activity', icon: FileClock, scope: 'platform' },
      { title: 'Sistema', path: '/system', icon: ServerCog, scope: 'platform' },
      { title: 'Asistente', path: '/platform/assistant', icon: BotMessageSquare, scope: 'platform' },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { title: 'Clientes', path: '/customers', icon: Users },
      { title: 'Recompra', path: '/customers/repurchase', icon: Repeat, module: 'repurchase' },
      { title: 'Reclamos', path: '/claims', icon: MessageSquareWarning },
      { title: 'Incidencias', path: '/incidents', icon: TriangleAlert },
      {
        title: 'Mensajes',
        path: '/messages',
        icon: MessageSquareText,
        module: 'chat',
        anyPermission: ['mensajes.clientes', 'mensajes.choferes'],
        companyAdminOnly: true,
        inboxBadge: true,
      },
      {
        title: 'Métricas de mensajes',
        path: '/messages/metrics',
        icon: ChartLine,
        module: 'chat',
        permission: 'mensajes.supervisar',
        companyAdminOnly: true,
      },
    ],
  },
  {
    title: 'Garrafas y envases',
    items: [
      { title: 'Garrafas', path: '/cylinders', icon: Flame },
      { title: 'Envases', path: '/physical-cylinders', icon: Cylinder },
      {
        title: 'Recupero de envases',
        path: '/physical-cylinders/recovery',
        icon: PackageSearch,
        module: 'cylinder_recovery',
      },
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
      { title: 'Planificador de taller', path: '/fleet/planner', icon: Wrench, module: 'fleet_planner' },
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
      { title: 'Conciliación MP', path: '/finance/mp-reconciliation', icon: ArrowLeftRight, module: 'mercadopago' },
      { title: 'Cajas de cobro', path: '/finance/collection-settings', icon: CreditCard },
      { title: 'Categorías', path: '/finance/categories', icon: Tags },
    ],
  },
  {
    title: 'Administración',
    items: [
      { title: 'Reportes', path: '/reports', icon: ChartLine },
      { title: 'Lectura de documentos', path: '/document-readings', icon: ScanText, module: 'document_reading' },
      { title: 'Notificaciones', path: '/notifications', icon: Bell, scope: 'both' },
      { title: 'Usuarios', path: '/users', icon: UserRound, scope: 'both' },
      { title: 'Administradores', path: '/admins', icon: ShieldCheck, scope: 'both' },
      { title: 'Roles del personal', path: '/staff-roles', icon: KeyRound, permission: 'roles.gestionar' },
      { title: 'Auditoría', path: '/audit', icon: FileClock },
      {
        title: 'Ayuda',
        path: '/support',
        icon: MessageCircleQuestion,
        permission: 'soporte.ver',
        companyAdminOnly: true,
        supportBadge: 'all',
      },
      {
        title: 'Accesos de soporte',
        path: '/support-access',
        icon: LifeBuoy,
        permission: 'soporte.ver',
        companyAdminOnly: true,
      },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { title: 'Configuración general', path: '/settings', icon: Settings },
      { title: 'Apariencia', path: '/settings/appearance', icon: Palette, permission: 'configuracion.ver' },
      { title: 'Zonas de cobertura', path: '/coverage-zones', icon: MapIcon },
      { title: 'Parámetros del despacho', path: '/settings/dispatch', icon: SlidersHorizontal },
      { title: 'Compra express', path: '/settings/express', icon: Zap, module: 'express' },
      { title: 'Procesos automáticos', path: '/settings/automatic-processes', icon: Bot },
      { title: 'Tareas programadas', path: '/settings/scheduled-tasks', icon: Timer },
      {
        title: 'Mensajes y horario',
        path: '/messages/settings',
        icon: CalendarClock,
        module: 'chat',
        permission: 'mensajes.configurar',
        companyAdminOnly: true,
      },
      {
        title: 'Asistente del chat',
        path: '/settings/assistant',
        icon: BotMessageSquare,
        permission: 'asistente.ver',
        module: 'assistant',
      },
    ],
  },
];
