export interface AuditFiltersState {
  actorUserId: string;
  resource: string;
  resourceId: string;
  result: '' | 'success' | 'failure';
  desde: string;
  hasta: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFiltersState = {
  actorUserId: '',
  resource: '',
  resourceId: '',
  result: '',
  desde: '',
  hasta: '',
};

const RESULT_LABEL: Record<'success' | 'failure', string> = { success: 'Exitosa', failure: 'Fallida' };

/** Un chip por cada filtro activo; la clave es la del campo de `AuditFiltersState` que se limpia al quitarlo. */
export const auditFilterChips = (filters: AuditFiltersState): { key: keyof AuditFiltersState; label: string }[] => {
  const chips: { key: keyof AuditFiltersState; label: string }[] = [];
  if (filters.resource) chips.push({ key: 'resource', label: `Recurso: ${filters.resource}` });
  if (filters.resourceId) chips.push({ key: 'resourceId', label: `ID: ${filters.resourceId}` });
  if (filters.actorUserId) chips.push({ key: 'actorUserId', label: `Autor: ${filters.actorUserId}` });
  if (filters.result) chips.push({ key: 'result', label: `Resultado: ${RESULT_LABEL[filters.result]}` });
  if (filters.desde) chips.push({ key: 'desde', label: `Desde ${filters.desde}` });
  if (filters.hasta) chips.push({ key: 'hasta', label: `Hasta ${filters.hasta}` });
  return chips;
};
