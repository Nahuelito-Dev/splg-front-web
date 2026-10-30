import type { ForecastItem, ForecastVehicle, PlanningCase, WindowProposal } from '../../../services/api/types';
import type { Label } from '../../../utils/statusLabels';
import { formatDay, formatNumber } from '../../../utils/format';

type Map<K extends string> = Record<K, Label>;

/** Cómo va la negociación de la ventana de taller de una tarea (CU-105). */
export const PLANNING_CASE_STATUS: Map<PlanningCase['status']> = {
  negotiating: { text: 'Con el chofer', tone: 'info' },
  awaiting_confirmation: { text: 'A confirmar', tone: 'warn' },
  escalated: { text: 'Escalado', tone: 'danger' },
  confirmed: { text: 'Programado', tone: 'success' },
  cancelled: { text: 'Cancelado', tone: 'neutral' },
};

/** Qué pasó con cada ventana que se le ofreció al chofer. */
export const WINDOW_PROPOSAL_STATUS: Map<WindowProposal['status']> = {
  pending: { text: 'Esperando respuesta', tone: 'info' },
  accepted: { text: 'Aceptada', tone: 'success' },
  rejected: { text: 'Rechazada', tone: 'danger' },
  expired: { text: 'Vencida', tone: 'warn' },
  cancelled: { text: 'Cancelada', tone: 'neutral' },
};

/** Quién fijó la ventana con que se programa el taller. */
export const WINDOW_SOURCE: Record<NonNullable<PlanningCase['chosenSource']>, string> = {
  driver_accepted: 'Aceptada por el chofer',
  driver_alternative: 'Propuesta por el chofer',
  admin: 'Elegida por el administrador',
};

/** Por qué se descartó una ventana del cuadro. */
export const DISCARD_REASON: Record<'coverage' | 'not_selected', string> = {
  coverage: 'Deja la zona bajo el mínimo de unidades',
  not_selected: 'Hay ventanas con menos demanda',
};

/** Los casos que esperan una decisión del administrador. */
export const PENDING_FOR_ADMIN: ReadonlyArray<PlanningCase['status']> = ['escalated', 'awaiting_confirmation'];

export const isOpenCase = (status: PlanningCase['status']): boolean =>
  status === 'negotiating' || status === 'awaiting_confirmation' || status === 'escalated';

const ARGENTINA = 'America/Argentina/Buenos_Aires';
const dayFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: ARGENTINA,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const hourFormat = new Intl.DateTimeFormat('es-AR', {
  timeZone: ARGENTINA,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** «lun, 2 nov, 08:00 a 13:00»: una ventana de taller en hora argentina (24 h, como se coordina con el taller). */
export const formatWindow = (start: string | null | undefined, end: string | null | undefined): string => {
  if (!start) return '—';
  const from = new Date(start);
  const day = dayFormat.format(from).replace('.', '');
  const hours =
    end && end !== start ? `${hourFormat.format(from)} a ${hourFormat.format(new Date(end))}` : hourFormat.format(from);
  return `${day}, ${hours}`;
};

/** De dónde sale el consumo diario que explica la proyección de un vehículo. */
export const usageText = (
  vehicle: Pick<ForecastVehicle, 'kmPerDay' | 'usageSource' | 'historyDays' | 'usageStale' | 'lastUsageDay'>,
): string => {
  if (vehicle.kmPerDay === null) {
    return 'Sin registro de uso suficiente ni promedio de su tipo: las tareas por kilometraje quedan en observación.';
  }
  const km = `${formatNumber(vehicle.kmPerDay)} km por día de uso`;
  if (vehicle.usageStale) {
    return `Datos de uso desactualizados (el último registro es del ${formatDay(vehicle.lastUsageDay)}): ${km}, pero no se proyecta con ellos.`;
  }
  return vehicle.usageSource === 'own'
    ? `${km}, estimado con ${vehicle.historyDays} días con registro de uso.`
    : `${km}: promedio de los vehículos del mismo tipo (todavía sin registro propio suficiente).`;
};

/** Por qué se proyecta esa fecha: los kilómetros que faltan o la fecha fija. */
export const projectionReason = (item: Pick<ForecastItem, 'kmRemaining' | 'predictedByKmAt' | 'dueAt' | 'dueKm'>) => {
  if (item.kmRemaining !== null && item.dueKm !== null) {
    if (item.kmRemaining <= 0) return `Ya llegó a los ${formatNumber(item.dueKm)} km`;
    return item.predictedByKmAt
      ? `Faltan ${formatNumber(item.kmRemaining)} km para los ${formatNumber(item.dueKm)} km`
      : `Faltan ${formatNumber(item.kmRemaining)} km y no hay consumo con qué proyectarlo`;
  }
  return item.dueAt ? 'Por su fecha de vencimiento' : 'Sin fecha de vencimiento';
};

/** «Vence en 12 días» / «Venció hace 3 días» / «Vence hoy». */
export const daysLeftText = (daysLeft: number | null): string => {
  if (daysLeft === null) return 'Sin fecha proyectada';
  const days = Math.abs(daysLeft);
  const plural = days === 1 ? 'día' : 'días';
  if (daysLeft < 0) return `Venció hace ${days} ${plural}`;
  return daysLeft === 0 ? 'Vence hoy' : `Vence en ${days} ${plural}`;
};

/** Un taller que ya pasó no cuenta como programado: la tarea sigue abierta. */
export const isFuture = (value: string | null | undefined): boolean =>
  Boolean(value) && new Date(value as string).getTime() > Date.now();

/** El estado de una tarea en el pronóstico: lo que el planificador hace (o no) con ella. */
export const forecastState = (item: ForecastItem): Label => {
  if (!item.needsWorkshop) return { text: 'Sin taller', tone: 'neutral' };
  if (item.underObservation) return { text: 'En observación', tone: 'neutral' };
  if (item.caseStatus) return PLANNING_CASE_STATUS[item.caseStatus];
  if (isFuture(item.scheduledAt)) return { text: 'Programada', tone: 'success' };
  if (item.dueSoon) return { text: 'Por vencer', tone: 'warn' };
  return { text: 'En regla', tone: 'success' };
};
