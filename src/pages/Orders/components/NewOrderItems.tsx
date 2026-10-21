import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { CirclePlus, Trash2 } from 'lucide-react';
import { Button, CardHeader, FormError, FormInput, FormSelect, IconButton, Input } from '../../../common/components/ui';
import { useGasCylinders } from '../../../services/queries/gasCylinders';
import { formatCurrency } from '../../../utils/format';
import type { NewOrderValues } from './newOrderSchema';

/** Los renglones del pedido: garrafa, cantidad y precio (sólo lectura: el back cobra siempre el de catálogo, con su promoción por volumen). */
export const NewOrderItems = () => {
  const { control, setValue } = useFormContext<NewOrderValues>();
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
        <CardHeader title="Ítems" as="h3" className="" />
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
                <FormSelect
                  name={`items.${index}.gasCylinderId`}
                  label="Garrafa"
                  options={cylinderOptions}
                  onChange={(e) => {
                    const picked = catalog?.rows.find((c) => c.gas_cylinder_id === e.target.value);
                    if (picked) setValue(`items.${index}.unitPrice`, picked.price);
                  }}
                />
              </div>
              <div className="w-24">
                <FormInput name={`items.${index}.quantity`} label="Cantidad" type="number" min={1} step={1} />
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

      <FormError name="items" />
    </div>
  );
};
