import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button, FormError, FormInput, FormSelect, IconButton } from '../../../common/components/ui';
import type { SelectOption } from '../../../common/components/ui';
import { withPlaceholder } from '../../Stock/components/useStockOptions';
import type { OpenLoadFormValues } from './truckLoadSchema';

interface Props {
  cylinders: SelectOption[];
  cylindersLimited?: boolean;
}

/** Los renglones de la carga: tipo de garrafa, llenas que salen y vacías que se llevan para canje. */
export const LoadItemsFields = ({ cylinders, cylindersLimited = false }: Props) => {
  const { control } = useFormContext<OpenLoadFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <fieldset key={field.id} className="min-w-0 rounded-lg border border-outline p-3">
          <legend className="px-1 text-xs font-medium text-muted">Garrafa {index + 1}</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-start">
            <FormSelect
              name={`items.${index}.gasCylinderId`}
              label="Tipo"
              options={withPlaceholder(cylinders)}
              hint={cylindersLimited ? 'Se muestran las primeras 100 garrafas.' : undefined}
            />
            <FormInput name={`items.${index}.loadedFull`} label="Llenas que salen" type="number" min={0} />
            <FormInput name={`items.${index}.loadedEmpty`} label="Vacías para canje" type="number" min={0} />
            {fields.length > 1 && (
              <IconButton
                label={`Quitar garrafa ${index + 1}`}
                icon={<Trash2 />}
                className="sm:mt-7"
                onClick={() => remove(index)}
              />
            )}
          </div>
        </fieldset>
      ))}
      <FormError name="items" />
      <FormError name="items.root" />
      <Button
        variant="secondary"
        size="sm"
        icon={<Plus />}
        disabled={fields.length >= 20}
        onClick={() => append({ gasCylinderId: '', loadedFull: 1, loadedEmpty: 0 })}
      >
        Agregar otra garrafa
      </Button>
    </div>
  );
};
