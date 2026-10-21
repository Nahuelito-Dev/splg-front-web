import { DateRangePicker } from './DateRangePicker';

interface Props {
  /** Extremos en YYYY-MM-DD; vacío = sin límite de ese lado. */
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  label?: string;
  /** Último día elegible (por defecto no hay tope: los listados filtran también por fechas futuras). */
  maxDay?: string;
}

/**
 * Filtro de fechas de un listado: reemplaza el par de `type="date"` «Desde / Hasta». Admite rangos abiertos (sólo
 * desde, sólo hasta) y quitar un extremo. Una fecha inválida (por ejemplo, de la URL) se ignora.
 */
export const DateRangeFilter = ({ from, to, onChange, label = 'Fechas', maxDay = '2100-12-31' }: Props) => (
  <DateRangePicker
    openEnds
    label={label}
    value={from || to ? { from, to } : null}
    emptyLabel={label}
    maxDay={maxDay}
    onChange={(range) => onChange(range)}
    onClear={from || to ? () => onChange({ from: '', to: '' }) : undefined}
  />
);
