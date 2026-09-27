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
