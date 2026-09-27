import {
  Building2,
  CalendarDays,
  ChartLine,
  Cylinder,
  FileClock,
  Flame,
  HardHat,
  House,
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

interface NavItem {
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
      { title: 'Reservas', path: '/reservations', icon: CalendarDays },
      { title: 'Seguimiento en vivo', path: '/tracking', icon: Navigation },
    ],
  },
  {
    title: 'Clientes y flota',
    items: [
      { title: 'Clientes', path: '/customers', icon: Users },
      { title: 'Choferes', path: '/deliveries', icon: HardHat },
      { title: 'Vehículos', path: '/cars', icon: Truck },
      { title: 'Calificaciones', path: '/ratings', icon: Star },
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
