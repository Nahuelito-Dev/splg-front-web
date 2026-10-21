export interface FilterChip {
  key: string;
  label: string;
  /** Qué filtro es («Estado»); sin él se deduce de `key` cuando es uno de los habituales. */
  name?: string;
}

const KEY_NAMES: Record<string, string> = {
  q: 'Búsqueda',
  search: 'Búsqueda',
  term: 'Búsqueda',
  status: 'Estado',
  state: 'Estado',
  type: 'Tipo',
  role: 'Rol',
  category: 'Categoría',
  position: 'Puesto',
  payment: 'Cobro',
  employee: 'Empleado',
  customer: 'Cliente',
  order: 'Pedido',
  date: 'Fecha',
  vigencia: 'Vigencia',
};

/** El chip dice el filtro: «Estado: Bloqueado». Si el texto ya lo dice («Cobro: …», «Pedido 1a2b»), queda como está. */
export const chipText = ({ key, label, name = KEY_NAMES[key] }: FilterChip): string =>
  !name || label.includes(':') || label.toLowerCase().startsWith(name.toLowerCase()) ? label : `${name}: ${label}`;
