import { DateRangePicker } from './DateRangePicker';

interface Props {
  /** Día en YYYY-MM-DD; vacío = sin filtrar por día. */
  value: string;
  onChange: (day: string) => void;
  label?: string;
  /** Qué dice el botón sin día (por ejemplo «Hoy» cuando la página muestra el día de hoy por defecto). */
  emptyLabel?: string;
  /** Último día elegible. Por defecto no hay tope; una pantalla que lo tenía antes lo pasa (p. ej. hoy). */
  maxDay?: string;
  disabled?: boolean;
}

/** Filtro de un solo día de un listado: reemplaza al `type="date"` suelto. Un clic en el calendario aplica. */
export const DayFilter = ({ value, onChange, label = 'Día', emptyLabel, maxDay = '2100-12-31', disabled }: Props) => (
  <DateRangePicker
    single
    label={label}
    value={value ? { from: value, to: value } : null}
    preset={null}
    emptyLabel={emptyLabel ?? label}
    maxDay={maxDay}
    disabled={disabled}
    onChange={(range) => onChange(range.from)}
    onClear={value ? () => onChange('') : undefined}
  />
);
