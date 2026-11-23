import type {
  CompanyDetail,
  CompanyListItem,
  CompanyMetrics,
  PlatformOverview,
  PlatformProcesses,
} from '../services/api/types';

/** Datos del panel de plataforma para los tests de pantalla (con la forma de los tipos generados). */
export const metrics = (over: Partial<CompanyMetrics> = {}): CompanyMetrics => ({
  orders: 155,
  salesOrders: 50,
  revenue: 1143120,
  activeDrivers: 10,
  customers: 11,
  ...over,
});

export const companyItem = (over: Partial<CompanyListItem> = {}): CompanyListItem => ({
  id: 'c-demo',
  name: 'Distribuidora Demo',
  slug: 'demo',
  logoUrl: null,
  status: 'active',
  ownedByPlatform: false,
  plan: null,
  createdAt: '2026-10-01T12:00:00.000Z',
  lastActivityAt: '2026-11-14T16:13:00.000Z',
  metrics: metrics(),
  processAlerts: 0,
  supportSessionActive: false,
  supportRequestsPending: 0,
  ...over,
});

export const overview = (over: Partial<PlatformOverview> = {}): PlatformOverview => ({
  range: { from: '2026-11-01', to: '2026-11-14' },
  companies: { total: 3, active: 3, suspended: 0 },
  totals: metrics(),
  documentReading: { month: '2026-11', readings: 14, costUsd: 0.2453 },
  processes: { alerts: 0, failuresLast24h: 0 },
  supportSessions: { active: 0, pending: 0 },
  generatedAt: '2026-11-14T17:11:00.000Z',
  ...over,
});

export const companyDetail = (over: Partial<CompanyDetail['company']> = {}): CompanyDetail => ({
  range: { from: '2026-11-01', to: '2026-11-14' },
  company: {
    id: 'c-gas',
    name: 'Nahuel Gas',
    slug: 'gas-andino',
    legalName: null,
    taxId: null,
    contactEmail: 'contacto@gasandino.com',
    status: 'active',
    ownedByPlatform: false,
    plan: null,
    createdAt: '2026-10-14T22:02:00.000Z',
    supportEmergencyAllowed: true,
    supportAutoApprove: false,
    ...over,
  },
  metrics: metrics({ orders: 3 }),
  lastActivityAt: null,
  documentReading: { month: '2026-11', readings: 0, costUsd: 0, enabled: false, monthlyBudgetUsd: 20 },
  processes: [
    {
      process: 'fleet_alerts',
      title: 'Aviso de vencimientos de flota',
      health: 'failed',
      lastRunAt: '2026-11-14T11:00:00.000Z',
      failuresLast24h: 2,
    },
  ],
  admins: [
    {
      userId: 'u1',
      name: 'Ana Admin',
      email: 'ana@gasandino.com',
      staffRole: 'Dueño',
      blocked: false,
      lastLoginAt: null,
    },
  ],
  supportSessions: [
    {
      id: 's1',
      kind: 'consented',
      status: 'ended',
      requestedByName: 'Nahuel Wagner',
      reason: 'Revisar un pedido trabado',
      requestedMinutes: 30,
      createdAt: '2026-11-10T12:00:00.000Z',
      startedAt: '2026-11-10T12:05:00.000Z',
      expiresAt: null,
      endedAt: '2026-11-10T12:20:00.000Z',
      endReason: 'exit',
    },
  ],
});

export const platformProcesses = (): PlatformProcesses => ({
  items: [
    {
      process: 'dispatch_tick',
      title: 'Despacho: tic de asignación',
      module: 'M1',
      global: false,
      companies: 3,
      expectedEverySeconds: 15,
      health: { ok: 3 },
      alerts: 0,
      failuresLast24h: 0,
      lastRunAt: '2026-11-14T17:10:00.000Z',
    },
    {
      process: 'stock_low_alert',
      title: 'Aviso de stock bajo',
      module: null,
      global: true,
      companies: 0,
      expectedEverySeconds: 86400,
      health: { late: 1 },
      alerts: 1,
      failuresLast24h: 2,
      lastRunAt: null,
    },
  ],
  alerts: 1,
  generatedAt: '2026-11-14T17:11:00.000Z',
});
