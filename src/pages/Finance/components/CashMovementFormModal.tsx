import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Form, FormInput, FormSelect, Modal } from '../../../common/components/ui';
import type { CreateCashMovementBody } from '../../../services/api/types';
import { useCashBoxOptions, useCashCategories, useCreateCashMovement } from '../../../services/queries/finance';
import { notify } from '../../../utils/notifications';
import { insufficientCashMessage, parseMoney, positiveMoney, requiredText } from '../financeSchemas';

const schema = z.object({
  cashBoxId: z.string().min(1, 'Elegí la caja'),
  direction: z.enum(['in', 'out'], { message: 'Elegí el sentido' }),
  amount: positiveMoney(),
  categoryId: z.string().min(1, 'Elegí la categoría'),
  method: z.enum(['cash', 'transfer', 'card', 'mercadopago', 'check']),
  description: requiredText('Escribí el motivo', 255),
});
type Values = z.infer<typeof schema>;

const METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'check', label: 'Cheque' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Caja con la que arranca el formulario (la que se está mirando). */
  defaultCashBoxId?: string;
}

/** Registrar una entrada o una salida de dinero (CU-228, CU-309). */
export const CashMovementFormModal = ({ open, onClose, defaultCashBoxId }: Props) => {
  const create = useCreateCashMovement();
  const boxes = useCashBoxOptions({ enabled: open });
  const categories = useCashCategories({ page: 0, pageSize: 100 }, {}, { enabled: open });
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset, watch, setError } = methods;
  const direction = watch('direction');

  useEffect(() => {
    if (open) {
      reset({
        cashBoxId: defaultCashBoxId ?? '',
        direction: 'in',
        amount: '',
        categoryId: '',
        method: 'cash',
        description: '',
      });
    }
  }, [open, defaultCashBoxId, reset]);

  const categoryOptions = [
    { value: '', label: 'Elegí una categoría' },
    ...(categories.data?.data ?? [])
      .filter((c) => c.direction === (direction === 'in' ? 'income' : 'expense'))
      .map((c) => ({ value: c.categoryId, label: c.name })),
  ];

  const onSubmit = async (values: Values) => {
    if (values.direction === 'out') {
      // Con el saldo de ahora; si no se puede traer, decide el back (409).
      const fresh = (await boxes.refetch()).data ?? boxes.data;
      const box = fresh?.data.find((b) => b.cashBoxId === values.cashBoxId);
      const insufficient = insufficientCashMessage(box, parseMoney(values.amount));
      if (insufficient) {
        setError('amount', { message: insufficient });
        return;
      }
    }
    const body: CreateCashMovementBody = { ...values, amount: parseMoney(values.amount) };
    create.mutate(body, {
      onSuccess: () => {
        notify.success(values.direction === 'in' ? 'Entrada registrada' : 'Salida registrada');
        onClose();
      },
      onError: notify.error,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={create.isPending}
      size="md"
      title="Registrar un movimiento"
      description="Entra o sale plata de una caja. Si te equivocás, se anula con un contraasiento: no se edita."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="cash-movement-form" loading={create.isPending}>
            Registrar
          </Button>
        </>
      }
    >
      <Form methods={methods} onSubmit={onSubmit} id="cash-movement-form" className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          name="cashBoxId"
          label="Caja"
          required
          options={[
            { value: '', label: 'Elegí una caja' },
            ...(boxes.data?.data ?? []).map((b) => ({ value: b.cashBoxId, label: b.name })),
          ]}
        />
        <FormSelect
          name="direction"
          label="Sentido"
          options={[
            { value: 'in', label: 'Entrada' },
            { value: 'out', label: 'Salida' },
          ]}
        />
        <FormInput name="amount" label="Importe" required inputMode="decimal" />
        <FormSelect name="method" label="Medio" options={METHODS} />
        <div className="sm:col-span-2">
          <FormSelect name="categoryId" label="Categoría" required options={categoryOptions} />
        </div>
        <div className="sm:col-span-2">
          <FormInput name="description" label="Motivo" required maxLength={255} />
        </div>
      </Form>
    </Modal>
  );
};
