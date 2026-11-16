import type { SelectOption } from '../../../common/components/ui';

export const ALL_TYPES = '';

/** Las opciones del combo "Tipo": todos los tipos del catálogo (con o sin stock), sin repetir y ordenados. */
export const buildTypeOptions = (products: ReadonlyArray<{ type: string }>): SelectOption[] => {
  const types = Array.from(new Set(products.map((p) => p.type))).sort();
  return [{ value: ALL_TYPES, label: 'Todos los tipos' }, ...types.map((type) => ({ value: type, label: type }))];
};

/** El tipo elegido, o "todos" si ya no existe en el catálogo (se borró o se desactivó). */
export const resolveTypeFilter = (selected: string, options: ReadonlyArray<SelectOption>): string =>
  options.some((option) => option.value === selected) ? selected : ALL_TYPES;
