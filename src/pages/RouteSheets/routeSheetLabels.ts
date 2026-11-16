import type {
  CloseRouteSheet,
  FailedStopBody,
  ProposalUnassigned,
  RoutePlan,
  RoutePlanDay,
  RouteSheet,
  RouteSheetExecution,
  RouteSheetExecutionStop,
  RouteSheetStop,
  RouteSheetStopAction,
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
  return [item.slotName, range].filter(Boolean).join(' ') || 'Sin franja fija';
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

/** «Retira 1 envase», «Retira 3 envases»: las vacías del canje que el chofer trae de vuelta. */
export const emptiesText = (n: number) => `Retira ${n} ${n === 1 ? 'envase' : 'envases'}`;

export const stopName = (stop: Pick<RouteSheetStop, 'customerName'>) => stop.customerName ?? 'Cliente';

/** Mueve un elemento de `from` a `to`; con índices fuera de rango devuelve la misma lista. */
export const move = <T>(list: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** La hoja se sigue en la calle desde que se inicia: en reparto o ya cerrada. */
export const isTracked = (status: RouteSheet['status']) => status === 'assigned' || status === 'completed';

/** Sólo se inicia una hoja el día del reparto (hora argentina); el back lo vuelve a controlar. */
export const isPlanToday = (planDate: string, now: Date = new Date()) => argentinaDay(now) === planDate;

export const STOP_PROGRESS: Record<RouteSheetExecutionStop['progress'], Label> = {
  pending: { text: 'Pendiente', tone: 'neutral' },
  on_the_way: { text: 'En camino', tone: 'info' },
  delivered: { text: 'Entregada', tone: 'success' },
  failed: { text: 'No entregada', tone: 'danger' },
  removed: { text: 'Fuera de la hoja', tone: 'neutral' },
};

/** Por qué una parada salió de la hoja en la calle (los códigos del back, en castellano). */
export const REMOVED_REASON: Record<NonNullable<RouteSheetExecutionStop['removedReason']>, string> = {
  cancelled: 'El pedido se canceló',
  moved: 'Pasó a otra hoja',
  reassigned: 'Se asignó a otro chofer',
  failed_delivery: 'No se pudo entregar',
  admin: 'La sacó un administrador',
  unavailable: 'Ya no estaba disponible al iniciar',
  sheet_closed: 'Quedó pendiente al cerrar la hoja',
  rescheduled: 'No se entregó en el segundo intento',
  needs_reschedule: 'Salió de la hoja por fuera del recorrido',
};

/** Los motivos de «No entregado» (los mismos que ve el chofer en la app). */
export const FAILED_REASON: Record<FailedStopBody['reason'], string> = {
  customer_absent: 'El cliente no estaba',
  rejected: 'Rechazó el pedido',
  wrong_address: 'La dirección no es correcta',
  no_access: 'No se pudo llegar',
  other: 'Otro',
};

/** La parada sigue en la hoja (pendiente, en camino o entregada) o ya salió. */
export const isActiveStop = (stop: RouteSheetExecutionStop) => stop.sequence !== null;

/** Pendiente o en camino: lo que todavía se puede marcar como no entregado. */
export const isOpenStop = (stop: RouteSheetExecutionStop) =>
  stop.progress === 'pending' || stop.progress === 'on_the_way';

/** Minutos de atraso de la hora vigente contra la prometida al confirmar (negativo si viene adelantada). */
export const delayMinutes = (stop: Pick<RouteSheetExecutionStop, 'etaAt' | 'plannedEtaAt'>): number | null =>
  stop.etaAt && stop.plannedEtaAt
    ? Math.round((new Date(stop.etaAt).getTime() - new Date(stop.plannedEtaAt).getTime()) / 60_000)
    : null;

/** Lunes a domingo con su bit en `workingDays` (lunes 1 … domingo 64). */
export const WEEK_DAYS = [
  { bit: 1, label: 'Lunes', short: 'Lu' },
  { bit: 2, label: 'Martes', short: 'Ma' },
  { bit: 4, label: 'Miércoles', short: 'Mi' },
  { bit: 8, label: 'Jueves', short: 'Ju' },
  { bit: 16, label: 'Viernes', short: 'Vi' },
  { bit: 32, label: 'Sábado', short: 'Sá' },
  { bit: 64, label: 'Domingo', short: 'Do' },
] as const;

/** Prende o apaga un día en la máscara de `workingDays`. */
export const toggleWorkingDay = (mask: number, bit: number, on: boolean) => (on ? mask | bit : mask & ~bit);

/** El día del pedido para mostrar: «lunes 16/11». */
export const dayLabel = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
  return `${weekday} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
};

/** «3 de 8 entregadas» */
export const progressText = ({ progress }: RouteSheetExecution) =>
  `${progress.delivered} de ${progress.total} entregada${progress.total === 1 ? '' : 's'}`;

/**
 * Qué pasó con el pedido: en el primer intento pasa al final del recorrido (con la franja nueva que se le avisó al
 * cliente); en el segundo, el sistema lo reprograma solo para el próximo día hábil, o queda esperando al admin.
 */
export const failedOutcomeText = (name: string, result: RouteSheetStopAction): string => {
  if (result.outcome === 'rescheduled') {
    return result.rescheduledTo
      ? `${name}: segundo intento sin entregar. Se reprogramó para el ${dayLabel(result.rescheduledTo)}, sin franja fija`
      : `${name}: segundo intento sin entregar. No se pudo reprogramar: quedó esperando que decidas`;
  }
  const window =
    result.newWindowStart && result.newWindowEnd
      ? ` Al cliente se le avisó la franja nueva: ${hhmm(result.newWindowStart)}–${hhmm(result.newWindowEnd)}`
      : '';
  return `${name}: pasó al final del recorrido.${window}`;
};

/** El aviso del cierre a mano: cuántos pedidos se reprogramaron solos y cuántos quedaron esperando al admin. */
export const closedText = (result: CloseRouteSheet): string => {
  const moved = result.rescheduled.filter((r) => r.scheduledDate).length;
  const waiting = result.rescheduled.length - moved;
  const parts = [
    moved > 0 && `${moved} pedido(s) se reprogramaron para el próximo día hábil`,
    waiting > 0 && `${waiting} quedaron esperando tu decisión`,
  ].filter(Boolean);
  return parts.length > 0 ? `Hoja cerrada: ${parts.join(' y ')}` : 'Hoja cerrada';
};
