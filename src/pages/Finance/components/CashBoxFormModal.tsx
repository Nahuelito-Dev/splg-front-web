import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormInput, FormCheckbox, FormSelect, Form } from '../../../common/components/ui';
import type { CashBox } from '../../../services/api/types';
import { useCreateCashBox, useUpdateCashBox } from '../../../services/queries/finance';
import { notify } from '../../../utils/notifications';
import { requiredText } from '../financeSchemas';

const schema = z.object({
  name: requiredText('Ingresá el nombre', 80),
  kind: z.enum(['cash', 'bank', 'wallet'], { message: 'Elegí el tipo' }),
  requiresSession: z.boolean(),
});
type Values = z.infer<typeof schema>;

const KIND_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Banco' },
  { value: 'wallet', label: 'Billetera virtual' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con caja es edición; sin ella, alta. */
  cashBox: CashBox | null;
}

/** Alta o edición de una caja (CU-225, CU-264). El tipo no se cambia después de creada. */
export const CashBoxFormModal = ({ open, onClose, cashBox }: Props) => {
  const create = useCreateCashBox();
  const update = useUpdateCashBox();
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset, watch } = methods;
  const kind = watch('kind');

  useEffect(() => {
    if (!open) return;
    reset({
      name: cashBox?.name ?? '',
      kind: cashBox?.kind ?? 'cash',
      requiresSession: cashBox?.requiresSession ?? true,
    });
  }, [open, cashBox, reset]);

  const onSubmit = (values: Values) => {
    const options = {
      onSuccess: () => {
        notify.success(cashBox ? 'Caja actualizada' : 'Caja creada');
        onClose();
      },
      onError: notify.error,
    };
    if (cashBox) {
      update.mutate(
        { id: cashBox.cashBoxId, body: { name: values.name, requiresSession: values.requiresSession } },
        options,
      );
    } else {
      create.mutate(values, options);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={create.isPending || update.isPending}
      title={cashBox ? 'Editar caja' : 'Nueva caja'}
      description="Dónde está la plata de la distribuidora: efectivo, banco o billetera."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="cash-box-form" loading={create.isPending || update.isPending}>
            {cashBox ? 'Guardar cambios' : 'Crear caja'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="cash-box-form" onSubmit={onSubmit} className="grid gap-4">
        <FormInput name="name" label="Nombre" required maxLength={80} />
        <FormSelect
          name="kind"
          label="Tipo"
          options={KIND_OPTIONS}
          disabled={cashBox !== null}
          hint={cashBox ? 'No se cambia una vez creada' : undefined}
        />
        <FormCheckbox
          name="requiresSession"
          label="Exige abrir y cerrar con arqueo"
          hint={
            kind === 'cash'
              ? 'Recomendado para efectivo: cada turno se abre con un monto y se cierra contando la plata.'
              : 'Banco y billetera normalmente no se abren ni se cierran.'
          }
        />
      </Form>
    </Modal>
  );
};
