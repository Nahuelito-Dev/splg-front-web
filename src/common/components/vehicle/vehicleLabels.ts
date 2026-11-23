import type { LiveVehicle, LiveVehicleLoad, LiveVehicleStop } from '../../../services/api/types';
import type { Label, Tone } from '../../../utils/statusLabels';

export const LIVE_VEHICLE_STATUS: Record<LiveVehicle['status'], Label> = {
  on_route: { text: 'En ruta', tone: 'success' },
  waiting: { text: 'Esperando', tone: 'warn' },
};

export const LIVE_STOP_PROGRESS: Record<LiveVehicleStop['progress'], Label> = {
  pending: { text: 'Pendiente', tone: 'primary' },
  on_the_way: { text: 'En camino', tone: 'info' },
  delivered: { text: 'Entregada', tone: 'success' },
  failed: { text: 'No entregada', tone: 'neutral' },
};

/** Más de esto de la capacidad se marca en advertencia; pasado el 100 %, en rojo. */
export const LOAD_WARN_PERCENT = 85;

export const loadTone = (percent: number | null): Tone =>
  percent === null ? 'neutral' : percent > 100 ? 'danger' : percent > LOAD_WARN_PERCENT ? 'warn' : 'primary';

/** «32 de 40 envases», o sólo lo que lleva si el vehículo no tiene la capacidad cargada. */
export const loadText = (load: Pick<LiveVehicleLoad, 'unitsOnBoard' | 'capacityUnits'>): string => {
  const units = `${load.unitsOnBoard} ${load.unitsOnBoard === 1 ? 'envase' : 'envases'}`;
  return load.capacityUnits === null ? `${units} a bordo` : `${load.unitsOnBoard} de ${load.capacityUnits} envases`;
};

/** Minutos que faltan hasta `iso`, redondeados; `null` sin hora. Negativo si ya pasó. */
export const minutesUntil = (iso: string | null | undefined, now: number): number | null =>
  iso ? Math.round((new Date(iso).getTime() - now) / 60_000) : null;

/** «Faltan 57 min», «Faltan 1 h 20 min», «Llegando» o «Demorado 12 min»; `null` sin hora estimada. */
export const remainingText = (iso: string | null | undefined, now: number): string | null => {
  const minutes = minutesUntil(iso, now);
  if (minutes === null) return null;
  if (minutes < 0) return `Demorado ${duration(-minutes)}`;
  if (minutes === 0) return 'Llegando';
  return `Faltan ${duration(minutes)}`;
};

const duration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)} h${rest ? ` ${rest} min` : ''}`;
};

const arTime = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Argentina/Buenos_Aires',
});

/** Hora argentina en 24 h. */
export const clockTime = (iso: string | null | undefined): string => (iso ? arTime.format(new Date(iso)) : '—');

/** Cómo se nombra un vehículo cuando hay que decirlo en una frase. */
export const vehicleName = (patent: string | null | undefined): string => patent ?? 'Sin patente';
