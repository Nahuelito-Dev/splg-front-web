import type {
  ProposalUnassigned,
  RoutePlan,
  RoutePlanDay,
  RouteSheet,
  RouteSheetStop,
  RouteSheetViolation,
} from '../../services/api/types';
import { argentinaDay } from '../../utils/format';
import type { Label } from '../../utils/statusLabels';

export const SHEET_STATUS: Record<RouteSheet['status'], Label> = {
  draft: { text: 'Borrador', tone: 'warn' },
  confirmed: { text: 'Confirmada', tone: 'success' },
  assigned: { text: 'En reparto', tone: 'info' },
  completed: { text: 'Completada', tone: 'success' },
  dissolved: { text: 'Descartada', tone: 'neutral' },
};

export const PLAN_STATUS: Record<RoutePlan['status'], Label> = {
  open: { text: 'Día abierto', tone: 'info' },
  proposed: { text: 'Propuesta hecha', tone: 'primary' },
  closed: { text: 'Día cerrado', tone: 'neutral' },
};

/** Por qué la propuesta dejó un pedido sin hoja (los códigos del back, en castellano). */
export const PROPOSAL_REASON: Record<ProposalUnassigned['reason'], string> = {
  capacity: 'No entra en ningún vehículo libre (capacidad)',
  window: 'No se llega dentro de su franja horaria',
  window_unverified: 'No se pudo verificar que se llegue en su franja',
  no_point: 'La dirección no tiene ubicación en el mapa',
  no_vehicles: 'No hay choferes con vehículo libres para ese día',
  not_plannable: 'Ya no se puede planificar (cambió de día, tiene chofer o se canceló)',
  dispatch_offer: 'Tiene una oferta del despacho esperando respuesta',
  in_route: 'Mientras se armaba, se agregó a otra hoja',
};

const CLOSE_REASON: Record<NonNullable<RouteSheet['closeReason']>, string> = {
  admin: 'Cancelada por un administrador',
  day_closed: 'Descartada al cerrar el día',
  exhausted: 'Sin choferes para ofrecerla',
  orders_unavailable: 'Sus pedidos dejaron de estar disponibles',
};

export const closeReasonOf = (sheet: RouteSheet): string =>
  sheet.closeReason ? CLOSE_REASON[sheet.closeReason] : 'Descartada';

/** Sólo un borrador se edita; una confirmada se reabre. */
export const isEditable = (sheet: RouteSheet) => sheet.status === 'draft';

/** El día siguiente al de hoy en Buenos Aires: el que se planifica por omisión. */
export const tomorrow = (now: Date = new Date()): string => {
  const [y, m, d] = argentinaDay(now).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

const arTime = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** 09:40, en hora argentina (la del reparto), sin importar la zona del navegador. */
export const hhmm = (iso: string | null | undefined): string => (iso ? arTime.format(new Date(iso)) : '—');

/** La hora de salida elegida en el formulario (HH:mm, hora argentina) como instante ISO del día del plan. */
export const startAtOf = (planDate: string, time: string): string =>
  new Date(`${planDate}T${time}:00-03:00`).toISOString();

export const formatKm = (km: number) => `${km.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;

export const formatMinutes = (minutes: number) => {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const rest = rounded % 60;
  return `${Math.floor(rounded / 60)} h${rest ? ` ${rest} min` : ''}`;
};

/** Mañana 08:00–12:00 */
export const slotOf = (item: { slotName: string | null; slotStart: string | null; slotEnd: string | null }) => {
  const range = item.slotStart && item.slotEnd ? `${hhmm(item.slotStart)}–${hhmm(item.slotEnd)}` : '';
  return [item.slotName, range].filter(Boolean).join(' ') || 'Sin franja';
};

/** El regreso al depósito: la salida más la duración total. */
export const returnAtOf = (sheet: RouteSheet): string | null =>
  sheet.plannedStartAt
    ? new Date(new Date(sheet.plannedStartAt).getTime() + sheet.totals.durationMin * 60_000).toISOString()
    : null;

/** «Hoja 12» si ya tiene número; si no, el chofer o «Borrador». */
export const sheetTitle = (sheet: RouteSheet): string =>
  sheet.number ? `Hoja ${sheet.number}` : sheet.driverName ? `Borrador · ${sheet.driverName}` : 'Borrador sin chofer';

export const vehicleOf = (sheet: RouteSheet) => sheet.carPatent ?? 'Sin vehículo';
export const driverOf = (sheet: RouteSheet) => sheet.driverName ?? 'Sin chofer';

/** Porcentaje de carga contra la capacidad del vehículo (unidades; si no, kilos). `null` si no se sabe. */
export const loadPercent = (sheet: RouteSheet): number | null => {
  const { units, kg } = sheet.capacity;
  if (units) return Math.round((sheet.totals.peakUnits / units) * 100);
  if (kg) return Math.round((sheet.totals.weightKg / kg) * 100);
  return null;
};

export const loadText = (sheet: RouteSheet): string => {
  const { units, kg } = sheet.capacity;
  if (units) return `${sheet.totals.peakUnits} / ${units} garrafas`;
  if (kg) return `${Math.round(sheet.totals.weightKg)} / ${kg} kg`;
  return `${sheet.totals.units} garrafas · sin capacidad cargada`;
};

/** Las violaciones que `acceptLateStops` saltea: sólo las paradas fuera de franja. */
export const onlyLateStops = (violations: RouteSheetViolation[]) =>
  violations.length > 0 && violations.every((v) => v.code === 'late_stops');

/** El nombre de quien recibe un pedido, buscándolo en las hojas y en «Sin asignar» del día. */
export const customerIndex = (day: RoutePlanDay | undefined): Map<string, string> => {
  const index = new Map<string, string>();
  for (const order of day?.unassigned ?? []) index.set(order.orderId, order.customerName ?? 'Cliente');
  for (const sheet of day?.sheets ?? [])
    for (const stop of sheet.stops) index.set(stop.orderId, stop.customerName ?? 'Cliente');
  return index;
};

export const stopName = (stop: RouteSheetStop) => stop.customerName ?? 'Cliente';

/** Mueve un elemento de `from` a `to`; con índices fuera de rango devuelve la misma lista. */
export const move = <T>(list: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};
