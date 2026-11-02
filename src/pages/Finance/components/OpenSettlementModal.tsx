import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
import { useDeliveryOptions } from '../../../services/queries/deliveries';
import { useOpenDriverSettlement } from '../../../services/queries/finance';
import { argentinaDay } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { day } from '../financeSchemas';

const schema = z.object({
  deliveryId: z.string().min(1, 'Elegí el chofer'),
  businessDate: day(),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Abrir a mano la rendición de un chofer para un día (CU-231; de noche el sistema abre las que faltan). */
export const OpenSettlementModal = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const open_ = useOpenDriverSettlement();
  const drivers = useDeliveryOptions();
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset } = methods;

  useEffect(() => {
    if (open) reset({ deliveryId: '', businessDate: argentinaDay(new Date()) });
  }, [open, reset]);

  const onSubmit = (values: Values) =>
    open_.mutate(values, {
      onSuccess: (settlement) => {
        notify.success('Rendición abierta');
        onClose();
        navigate(`/finance/settlements/${settlement.settlementId}`);
      },
      onError: notify.error,
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={open_.isPending}
      title="Abrir una rendición"
      description="Toma los pedidos en efectivo entregados por el chofer que todavía no rindió."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="open-settlement-form" loading={open_.isPending}>
            Abrir rendición
          </Button>
        </>
      }
    >
      <Form methods={methods} id="open-settlement-form" onSubmit={onSubmit} className="grid gap-4">
        <FormSelect
          name="deliveryId"
          label="Chofer"
          required
          options={[
            { value: '', label: 'Elegí un chofer' },
            ...(drivers.data?.rows ?? []).map((d) => ({
              value: d.delivery_id,
              label: d.user?.full_name ?? d.delivery_id.slice(-6),
            })),
          ]}
        />
        <FormInput name="businessDate" label="Día" type="date" required />
      </Form>
    </Modal>
  );
};
