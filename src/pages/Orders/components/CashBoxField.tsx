import { Select } from '../../../common/components/ui';

interface Props {
  boxes: { cashBoxId: string; name: string }[];
  value: string;
  onChange: (cashBoxId: string) => void;
  error?: string;
}

/** «Caja»: dónde entra el efectivo cobrado. No se dibuja si la distribuidora no tiene cajas. */
export const CashBoxField = ({ boxes, value, onChange, error }: Props) => {
  if (boxes.length === 0) return null;
  return (
    <Select
      label="Caja"
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={[{ value: '', label: 'Elegí una caja' }, ...boxes.map((b) => ({ value: b.cashBoxId, label: b.name }))]}
      hint="El efectivo cobrado entra a esta caja. Si exige sesión, tiene que estar abierta."
      error={error}
    />
  );
};
