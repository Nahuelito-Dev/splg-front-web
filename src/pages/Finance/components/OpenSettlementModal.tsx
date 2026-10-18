import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
import { useDeliveryOptions } from '../../../services/queries/deliveries';
import { useOpenDriverSettlement } from '../../../services/queries/finance';
import { toIsoDay } from '../../../utils/dates';
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset({ deliveryId: '', businessDate: toIsoDay(new Date()) });
  }, [open, reset]);

  const onSubmit = handleSubmit((values) =>
    open_.mutate(values, {
      onSuccess: (settlement) => {
        notify.success('Rendición abierta');
        onClose();
        navigate(`/finance/settlements/${settlement.settlementId}`);
      },
      onError: notify.error,
    }),
  );

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
      <form id="open-settlement-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4" noValidate>
        <Select
          label="Chofer"
          required
          options={[
            { value: '', label: 'Elegí un chofer' },
            ...(drivers.data?.rows ?? []).map((d) => ({
              value: d.delivery_id,
              label: d.user?.full_name ?? d.delivery_id.slice(-6),
            })),
          ]}
          error={errors.deliveryId?.message}
          {...register('deliveryId')}
        />
        <Input label="Día" type="date" required error={errors.businessDate?.message} {...register('businessDate')} />
      </form>
    </Modal>
  );
};
