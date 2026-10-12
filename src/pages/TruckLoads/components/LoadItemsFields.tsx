import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { Button, IconButton, Input, Select } from '../../../common/components/ui';
import type { SelectOption } from '../../../common/components/ui';
import { withPlaceholder } from '../../Stock/components/useStockOptions';
import type { OpenLoadFormValues } from './truckLoadSchema';

interface Props {
  control: Control<OpenLoadFormValues>;
  register: UseFormRegister<OpenLoadFormValues>;
  errors: FieldErrors<OpenLoadFormValues>;
  cylinders: SelectOption[];
}

/** Los renglones de la carga: tipo de garrafa, llenas que salen y vacías que se llevan para canje. */
export const LoadItemsFields = ({ control, register, errors, cylinders }: Props) => {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <fieldset key={field.id} className="min-w-0 rounded-lg border border-outline p-3">
          <legend className="px-1 text-xs font-medium text-muted">Garrafa {index + 1}</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-start">
            <Select
              label="Tipo"
              options={withPlaceholder(cylinders)}
              error={errors.items?.[index]?.gasCylinderId?.message}
              {...register(`items.${index}.gasCylinderId`)}
            />
            <Input
              label="Llenas que salen"
              type="number"
              min={1}
              error={errors.items?.[index]?.loadedFull?.message}
              {...register(`items.${index}.loadedFull`)}
            />
            <Input
              label="Vacías para canje"
              type="number"
              min={0}
              error={errors.items?.[index]?.loadedEmpty?.message}
              {...register(`items.${index}.loadedEmpty`)}
            />
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
      {errors.items?.message && (
        <p role="alert" className="text-xs text-danger">
          {errors.items.message}
        </p>
      )}
      {errors.items?.root?.message && (
        <p role="alert" className="text-xs text-danger">
          {errors.items.root.message}
        </p>
      )}
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
