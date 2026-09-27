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
  gasCylinders: resource('gasCylinders'),
  health: resource('health'),
  incidents: resource('incidents'),
  orders: resource('orders'),
  ratings: resource('ratings'),
  reports: resource('reports'),
  reservations: resource('reservations'),
  roles: resource('roles'),
  stats: resource('stats'),
  timeSlots: resource('timeSlots'),
  userAddresses: resource('userAddresses'),
  users: resource('users'),
} as const;
