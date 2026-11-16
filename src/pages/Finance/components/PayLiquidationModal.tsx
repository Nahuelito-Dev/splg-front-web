import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormSelect, Form } from '../../../common/components/ui';
import type { DriverLiquidation } from '../../../services/api/types';
import { useCashBoxOptions, usePayDriverLiquidation } from '../../../services/queries/finance';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';

const schema = z.object({ cashBoxId: z.string().min(1, 'Elegí la caja de la que sale el pago') });
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  liquidation: DriverLiquidation;
}

/** Pagar una liquidación aprobada (CU-243): el neto sale de una caja. */
export const PayLiquidationModal = ({ open, onClose, liquidation }: Props) => {
  const pay = usePayDriverLiquidation();
  const boxes = useCashBoxOptions({ enabled: open });
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset } = methods;

  useEffect(() => {
    if (open) reset({ cashBoxId: '' });
  }, [open, reset]);

  const onSubmit = (values: Values) =>
    pay.mutate(
      { id: liquidation.liquidationId, body: values },
      {
        onSuccess: () => {
          notify.success('Liquidación pagada');
          onClose();
        },
        onError: notify.error,
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={pay.isPending}
      title="Pagar la liquidación"
      description={`Salen ${formatCurrency(liquidation.net)} de la caja que elijas.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="pay-liquidation-form" loading={pay.isPending}>
            Pagar
          </Button>
        </>
      }
    >
      <Form methods={methods} id="pay-liquidation-form" onSubmit={onSubmit}>
        <FormSelect
          name="cashBoxId"
          label="Caja"
          required
          options={[
            { value: '', label: 'Elegí una caja' },
            ...(boxes.data?.data ?? []).map((b) => ({
              value: b.cashBoxId,
              label: `${b.name} · ${formatCurrency(b.balance)}`,
            })),
          ]}
          hint="Una caja de efectivo necesita saldo y, si exige sesión, tenerla abierta."
        />
      </Form>
    </Modal>
  );
};
