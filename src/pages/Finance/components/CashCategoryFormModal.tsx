import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
import type { CashCategory } from '../../../services/api/types';
import { useCreateCashCategory, useUpdateCashCategory } from '../../../services/queries/finance';
import { notify } from '../../../utils/notifications';
import { requiredText } from '../financeSchemas';

const schema = z.object({
  name: requiredText('Ingresá el nombre', 80),
  direction: z.enum(['income', 'expense'], { message: 'Elegí el sentido' }),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  category: CashCategory | null;
}

/** Alta o renombre de una categoría de ingresos y gastos (CU-230, CU-265). */
export const CashCategoryFormModal = ({ open, onClose, category }: Props) => {
  const create = useCreateCashCategory();
  const update = useUpdateCashCategory();
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset } = methods;

  useEffect(() => {
    if (open) reset({ name: category?.name ?? '', direction: category?.direction ?? 'expense' });
  }, [open, category, reset]);

  const onSubmit = (values: Values) => {
    const options = {
      onSuccess: () => {
        notify.success(category ? 'Categoría actualizada' : 'Categoría creada');
        onClose();
      },
      onError: notify.error,
    };
    if (category) update.mutate({ id: category.categoryId, body: { name: values.name } }, options);
    else create.mutate(values, options);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={create.isPending || update.isPending}
      title={category ? 'Renombrar categoría' : 'Nueva categoría'}
      description="Para clasificar lo que entra y lo que sale de las cajas."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="cash-category-form" loading={create.isPending || update.isPending}>
            {category ? 'Guardar' : 'Crear categoría'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="cash-category-form" onSubmit={onSubmit} className="grid gap-4">
        <FormInput name="name" label="Nombre" required maxLength={80} />
        <FormSelect
          name="direction"
          label="Sentido"
          options={[
            { value: 'income', label: 'Ingreso' },
            { value: 'expense', label: 'Gasto' },
          ]}
          disabled={category !== null}
          hint={category ? 'No se cambia una vez creada' : undefined}
        />
      </Form>
    </Modal>
  );
};
