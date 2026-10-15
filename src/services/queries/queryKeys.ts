/**
 * Claves de React Query, una fábrica por recurso. Invalidar `queryKeys.x.all`
 * refresca todo lo de ese recurso (listas y detalles).
 */
const resource = <R extends string>(name: R) => ({
  all: [name] as const,
  lists: () => [name, 'list'] as const,
  list: (filters: object = {}) => [name, 'list', filters] as const,
  detail: (id: string) => [name, 'detail', id] as const,
});

export const queryKeys = {
  admins: resource('admins'),
  audit: resource('audit'),
  cars: resource('cars'),
  claims: resource('claims'),
  coverageZones: resource('coverageZones'),
  customers: resource('customers'),
  cylinders: resource('cylinders'),
  deliveries: resource('deliveries'),
  distributors: resource('distributors'),
  employees: resource('employees'),
  fleet: resource('fleet'),
  gasCylinders: resource('gasCylinders'),
  health: resource('health'),
  incidents: resource('incidents'),
  jobPositions: resource('jobPositions'),
  moduleConfig: resource('moduleConfig'),
  attachments: resource('attachments'),
  orders: resource('orders'),
  ratings: resource('ratings'),
  reports: resource('reports'),
  purchaseOrders: resource('purchaseOrders'),
  purchaseReceipts: resource('purchaseReceipts'),
  reservations: resource('reservations'),
  roles: resource('roles'),
  search: resource('search'),
  stats: resource('stats'),
  stock: resource('stock'),
  suppliers: resource('suppliers'),
  timeSlots: resource('timeSlots'),
  truckLoads: resource('truckLoads'),
  userAddresses: resource('userAddresses'),
  users: resource('users'),
  warehouses: resource('warehouses'),
} as const;
