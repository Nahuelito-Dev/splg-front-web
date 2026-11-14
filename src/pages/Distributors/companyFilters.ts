import { formatDay } from '../../utils/format';

/** Los filtros del listado de empresas, como viven en la URL (vacío = sin filtro). */
export interface CompanyFilters {
  status: string;
  /** `'true'`: sólo la propia; `'false'`: sin la propia. */
  owned: string;
  from: string;
  to: string;
}

export const EMPTY_COMPANY_FILTERS: CompanyFilters = { status: '', owned: '', from: '', to: '' };

/** Un chip por filtro activo; la clave es la del campo que se limpia al quitarlo. */
export const companyFilterChips = (filters: CompanyFilters): { key: keyof CompanyFilters; label: string }[] => {
  const chips: { key: keyof CompanyFilters; label: string }[] = [];
  if (filters.status) chips.push({ key: 'status', label: filters.status === 'active' ? 'Activas' : 'Suspendidas' });
  if (filters.owned) chips.push({ key: 'owned', label: filters.owned === 'true' ? 'Sólo la propia' : 'Sin la propia' });
  if (filters.from) chips.push({ key: 'from', label: `Desde ${formatDay(filters.from)}` });
  if (filters.to) chips.push({ key: 'to', label: `Hasta ${formatDay(filters.to)}` });
  return chips;
};
