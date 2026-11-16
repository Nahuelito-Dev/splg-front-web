import { Select } from '../../../common/components/ui';

interface Props {
  boxes: { cashBoxId: string; name: string }[];
  value: string;
  onChange: (cashBoxId: string) => void;
  error?: string;
  /** Por omisión, el del cobro que entra a la caja; el pago en efectivo que sale de ella lo cambia. */
  hint?: string;
}

/** «Caja»: dónde entra (o de dónde sale) el efectivo. No se dibuja si la distribuidora no tiene cajas. */
export const CashBoxField = ({
  boxes,
  value,
  onChange,
  error,
  hint = 'El efectivo cobrado entra a esta caja. Si exige sesión, tiene que estar abierta.',
}: Props) => {
  if (boxes.length === 0) return null;
  return (
    <Select
      label="Caja"
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={[{ value: '', label: 'Elegí una caja' }, ...boxes.map((b) => ({ value: b.cashBoxId, label: b.name }))]}
      hint={hint}
      error={error}
    />
  );
};
