import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Button, FormError, FormInput, IconButton } from '../../../common/components/ui';
import { formatCurrency } from '../../../utils/format';
import type { GasCylinderFormValues } from './gasCylinderSchema';
import { discountedPrice } from './pricing';

interface Props {
  price: number;
}

/** Reglas de descuento por cantidad del producto: "llevando N, X% off". */
export const PromotionsFieldArray = ({ price }: Props) => {
  const { control } = useFormContext<GasCylinderFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'promotions' });
  const promotions = useWatch({ control, name: 'promotions' });

  return (
    <fieldset className="rounded-xl border border-outline p-4">
      <div className="flex items-center justify-between gap-2">
        <legend className="px-1 text-sm font-medium text-ink">Promociones por cantidad</legend>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<AddCircleOutlineIcon />}
          onClick={() => append({ quantity: 2, discountPercentage: 10 })}
        >
          Agregar
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Sin promociones. Ej: "llevando 3 unidades, 10% off".</p>
      ) : (
        <div className="mt-3 space-y-3">
          {fields.map((field, index) => {
            const discount = promotions?.[index]?.discountPercentage;
            const finalPrice = price > 0 && Number(discount) > 0 ? discountedPrice(price, Number(discount)) : null;
            return (
              <div key={field.id} className="flex flex-wrap items-end gap-3">
                <FormInput
                  name={`promotions.${index}.quantity`}
                  label="Desde (unidades)"
                  type="number"
                  className="w-28"
                />
                <FormInput
                  name={`promotions.${index}.discountPercentage`}
                  label="Descuento (%)"
                  type="number"
                  className="w-28"
                />
                <p className="pb-2.5 text-xs text-muted">
                  {finalPrice !== null ? `Queda en ${formatCurrency(finalPrice)} c/u` : ''}
                </p>
                <div className="pb-1">
                  <IconButton
                    label="Quitar promoción"
                    tone="danger"
                    icon={<DeleteOutlineIcon />}
                    onClick={() => remove(index)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <FormError name="promotions" />
    </fieldset>
  );
};
