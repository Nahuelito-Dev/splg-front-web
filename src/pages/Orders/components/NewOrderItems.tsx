import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { CirclePlus, Trash2 } from 'lucide-react';
import { Button, IconButton, Input, Select } from '../../../common/components/ui';
import { useGasCylinders } from '../../../services/queries/gasCylinders';
import { formatCurrency } from '../../../utils/format';
import type { NewOrderValues } from './newOrderSchema';

interface Props {
  control: Control<NewOrderValues>;
  register: UseFormRegister<NewOrderValues>;
  setValue: UseFormSetValue<NewOrderValues>;
  errors: FieldErrors<NewOrderValues>;
}

/** Los renglones del pedido: garrafa, cantidad y precio (sólo lectura: el back cobra siempre el de catálogo, con su promoción por volumen). */
export const NewOrderItems = ({ control, register, setValue, errors }: Props) => {
  const { data: catalog } = useGasCylinders({ page: 0, pageSize: 100 });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const items = useWatch({ control, name: 'items' });
  const priceOf = (id: string | undefined): string => {
    const picked = catalog?.rows.find((c) => c.gas_cylinder_id === id);
    return picked ? formatCurrency(picked.price) : '';
  };

  const cylinderOptions = [
    { value: '', label: 'Elegí una garrafa' },
    ...(catalog?.rows
      .filter((c) => c.isActive)
      .map((c) => ({ value: c.gas_cylinder_id, label: `${c.type} — ${formatCurrency(c.price)}` })) ?? []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Ítems</h3>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<CirclePlus />}
          onClick={() => append({ gasCylinderId: '', quantity: 1, unitPrice: 0 })}
        >
          Agregar
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted">Sin ítems todavía.</p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-end gap-3 rounded-xl border border-outline p-3">
              <div className="min-w-[220px] flex-1">
                <Select
                  label="Garrafa"
                  options={cylinderOptions}
                  error={errors.items?.[index]?.gasCylinderId?.message}
                  {...register(`items.${index}.gasCylinderId`)}
                  onChange={(e) => {
                    setValue(`items.${index}.gasCylinderId`, e.target.value);
                    const picked = catalog?.rows.find((c) => c.gas_cylinder_id === e.target.value);
                    if (picked) setValue(`items.${index}.unitPrice`, picked.price);
                  }}
                />
              </div>
              <div className="w-24">
                <Input
                  label="Cantidad"
                  type="number"
                  min={1}
                  step={1}
                  error={errors.items?.[index]?.quantity?.message}
                  {...register(`items.${index}.quantity`)}
                />
              </div>
              <div className="w-32">
                <Input
                  label="Precio unitario"
                  readOnly
                  tabIndex={-1}
                  value={priceOf(items?.[index]?.gasCylinderId)}
                  placeholder="—"
                />
              </div>
              <div className="pb-1">
                <IconButton label="Quitar ítem" tone="danger" icon={<Trash2 />} onClick={() => remove(index)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {errors.items?.message && (
        <p role="alert" className="text-xs text-danger">
          {errors.items.message}
        </p>
      )}
    </div>
  );
};
