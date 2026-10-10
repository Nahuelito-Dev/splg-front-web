import { auditEntityLabel } from '../../../utils/auditLabels';
import type { AuditEntriesParams } from '../../../services/api/audit';

/** Filtros de la auditoría de datos tal como viven en la URL (todo texto). */
export interface DataAuditFilters {
  entity: string;
  recordId: string;
  userId: string;
  actionType: string;
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
}

export const EMPTY_DATA_AUDIT_FILTERS: DataAuditFilters = {
  entity: '',
  recordId: '',
  userId: '',
  actionType: '',
  from: '',
  to: '',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** El back valida el `recordId` con MaxLength(64). */
export const RECORD_ID_MAX = 64;

const isUuid = (value: string) => UUID.test(value.trim());
const isDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day));
const validAction = (value: string) => Boolean(value) && Number.isInteger(Number(value));

/** Errores de los campos de texto, para mostrarlos en el campo en vez de pedirle al back algo que rechaza (400). */
export const dataAuditErrors = (filters: DataAuditFilters): { userId?: string } =>
  filters.userId.trim() && !isUuid(filters.userId) ? { userId: 'UUID inválido' } : {};

const startOfDay = (day: string) => new Date(`${day}T00:00:00`).toISOString();
const endOfDay = (day: string) => new Date(`${day}T23:59:59.999`).toISOString();

/** Pasa los filtros de pantalla a los parámetros de `GET /audit/entries`. Lo inválido no se manda. */
export const toAuditEntriesParams = (filters: DataAuditFilters, page: number, limit: number): AuditEntriesParams => ({
  entity: filters.entity.trim() || undefined,
  recordId: filters.recordId.trim().slice(0, RECORD_ID_MAX) || undefined,
  userId: isUuid(filters.userId) ? filters.userId.trim() : undefined,
  actionType: validAction(filters.actionType) ? Number(filters.actionType) : undefined,
  from: isDay(filters.from) ? startOfDay(filters.from) : undefined,
  to: isDay(filters.to) ? endOfDay(filters.to) : undefined,
  page,
  limit,
});

/** Un chip por cada filtro que de verdad se aplica (los inválidos no se piden, así que tampoco se muestran). */
export const dataAuditChips = (
  filters: DataAuditFilters,
  actionName: (id: number) => string | undefined,
): { key: keyof DataAuditFilters; label: string }[] => {
  const chips: { key: keyof DataAuditFilters; label: string }[] = [];
  if (filters.entity.trim()) chips.push({ key: 'entity', label: `Entidad: ${auditEntityLabel(filters.entity)}` });
  if (filters.recordId.trim()) chips.push({ key: 'recordId', label: `Registro: ${filters.recordId.trim()}` });
  if (isUuid(filters.userId)) chips.push({ key: 'userId', label: `Autor: ${filters.userId.trim()}` });
  if (validAction(filters.actionType)) {
    chips.push({
      key: 'actionType',
      label: `Acción: ${actionName(Number(filters.actionType)) ?? filters.actionType}`,
    });
  }
  if (isDay(filters.from)) chips.push({ key: 'from', label: `Desde ${filters.from}` });
  if (isDay(filters.to)) chips.push({ key: 'to', label: `Hasta ${filters.to}` });
  return chips;
};
