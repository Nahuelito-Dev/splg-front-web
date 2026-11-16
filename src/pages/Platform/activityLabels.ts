import type { ActivityItem } from '../../services/api/types';

/**
 * Cómo se lee cada registro de la auditoría de plataforma: la API da el método y el patrón de la ruta
 * (`PUT /api/v2/platform/companies/:id/owned-by-platform`); acá se traducen a «Marcó o desmarcó la empresa propia».
 * Lo que no está en el mapa cae en «verbo · recurso», siempre en castellano y sin la ruta cruda.
 */

/** Las acciones de la plataforma y del soporte, por método y ruta sin versión. */
const ACTIONS: Record<string, string> = {
  'PUT /platform/companies/:id/owned-by-platform': 'Marcó o desmarcó la empresa propia',
  'PUT /platform/companies/:id/scheduled-tasks': 'Cambió las frecuencias de las tareas programadas',
  'PUT /module-config/scheduled_tasks': 'Cambió la hora del aviso de vencimientos de flota',
  'POST /support-sessions': 'Pidió acceso de soporte',
  'DELETE /support-sessions/:id': 'Salió del modo soporte o retiró el pedido',
  'POST /support-access/:id/approve': 'Aprobó un acceso de soporte',
  'POST /support-access/:id/reject': 'Rechazó un acceso de soporte',
  'POST /support-access/:id/revoke': 'Revocó un acceso de soporte',
  'POST /distributor': 'Dio de alta una empresa',
  'PATCH /distributor/:id': 'Modificó una empresa',
  'DELETE /distributor/:id': 'Dio de baja una empresa',
  'PUT /distributor/:id/logo': 'Cambió el logo de una empresa',
  'DELETE /distributor/:id/logo': 'Quitó el logo de una empresa',
  'POST /role': 'Creó un rol',
  'POST /role/seed': 'Cargó los roles del sistema',
  'PATCH /role/:id': 'Modificó un rol',
  'DELETE /role/:id': 'Borró un rol',
  'POST /admin': 'Dio de alta un administrador',
  'PATCH /admin/:id': 'Modificó un administrador',
  'DELETE /admin/:id': 'Dio de baja un administrador',
  'PUT /admins/:id/staff-role': 'Cambió el rol de personal de un administrador',
  'POST /email/test': 'Mandó un correo de prueba',
  'POST /notifications/send-test': 'Mandó un push de prueba',
  'POST /users': 'Dio de alta un usuario',
  'PATCH /users/:id': 'Modificó un usuario',
  'DELETE /users/:id': 'Dio de baja un usuario',
  'PUT /users/:id/photo': 'Cambió la foto de un usuario',
};

/** Los recursos (primer tramo de la ruta), en castellano. */
const RESOURCES: Record<string, string> = {
  platform: 'Plataforma',
  distributor: 'Empresa',
  'support-sessions': 'Soporte',
  'support-access': 'Accesos de soporte',
  role: 'Roles',
  'staff-roles': 'Roles de personal',
  admin: 'Administradores',
  admins: 'Administradores',
  users: 'Usuarios',
  customers: 'Clientes',
  'customer-accounts': 'Cuentas de clientes',
  orders: 'Pedidos',
  'route-planning': 'Recorridos',
  'route-sheets': 'Hojas de ruta',
  'truck-loads': 'Cargas del camión',
  cylinders: 'Envases',
  'cylinder-recovery': 'Recupero de envases',
  gascylinder: 'Garrafas',
  stock: 'Stock',
  warehouses: 'Galpones',
  'document-readings': 'Lectura de documentos',
  'module-config': 'Configuración',
  'coverage-zones': 'Zonas de cobertura',
  employees: 'Legajos',
  fleet: 'Flota',
  car: 'Vehículos',
  'cash-sessions': 'Cajas',
  'cash-movements': 'Movimientos de caja',
  'driver-settlements': 'Rendiciones',
  'payment-surcharges': 'Recargos',
  mercadopago: 'Mercado Pago',
  'purchase-receipts': 'Recepciones de compra',
  notifications: 'Notificaciones',
  'admin-notifications': 'Avisos del panel',
  people: 'Fotos de personas',
  imports: 'Importaciones',
  email: 'Correo',
};

const VERBS: Record<string, string> = {
  POST: 'Creó o ejecutó',
  PUT: 'Cambió',
  PATCH: 'Modificó',
  DELETE: 'Dio de baja o quitó',
};

/** `/api/v2/platform/companies/:id` → `/platform/companies/:id` (sin prefijo ni versión). */
export const routeOf = (path: string): string => path.replace(/^\/api/, '').replace(/^\/v\d+(?=\/)/, '');

/** El primer tramo de la ruta: el recurso real (la API a veces informa `v1` o `v2` como recurso). */
const resourceOf = (item: Pick<ActivityItem, 'path' | 'resource'>): string =>
  item.path ? (routeOf(item.path).split('/')[1] ?? item.resource) : item.resource;

/** El área del registro, en castellano. */
export const activityArea = (item: Pick<ActivityItem, 'kind' | 'path' | 'resource'>): string => {
  if (item.kind === 'login') return 'Panel';
  const resource = resourceOf(item);
  return RESOURCES[resource] ?? 'Otra pantalla';
};

/** Qué se hizo, en castellano. */
export const activityAction = (item: Pick<ActivityItem, 'kind' | 'method' | 'path' | 'resource'>): string => {
  if (item.kind === 'login') return 'Ingresó al panel';
  const route = item.path ? routeOf(item.path) : '';
  const known = item.method ? ACTIONS[`${item.method} ${route}`] : undefined;
  if (known) return known;
  const verb = (item.method && VERBS[item.method]) ?? 'Operó';
  return `${verb} · ${activityArea(item)}`;
};

/** Lo que miró el soporte (`SupportAccessEntry`): una consulta por registro, con el método y la ruta que dio la API. */
interface SupportAccessLike {
  httpMethod: string;
  path: string;
  resource: string | null;
}

/**
 * Una consulta del soporte en castellano: «Consultó · Pedidos». Nunca el método ni la ruta de la API; lo que no es una
 * lectura (no debería pasar: el modo soporte es de sólo lectura) se lee como en la auditoría de plataforma.
 */
export const supportAccessAction = (entry: SupportAccessLike): string => {
  const item = { kind: 'request' as const, path: entry.path, resource: entry.resource ?? '' };
  if (entry.httpMethod === 'GET' || entry.httpMethod === 'HEAD') return `Consultó · ${activityArea(item)}`;
  return activityAction({ ...item, method: entry.httpMethod });
};
