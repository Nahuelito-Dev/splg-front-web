import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
import { useEmployees } from '../../../services/queries/employees';
import { useCreateDriverLiquidation } from '../../../services/queries/finance';
import { toIsoDay } from '../../../utils/dates';
import { notify } from '../../../utils/notifications';
import { day } from '../financeSchemas';

const schema = z
  .object({
    employeeId: z.string().min(1, 'Elegí el chofer'),
    periodFrom: day('Elegí desde cuándo'),
    periodTo: day('Elegí hasta cuándo'),
  })
  .refine((v) => v.periodFrom <= v.periodTo, { path: ['periodTo'], message: 'No puede ser anterior al inicio' });
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Liquidar las comisiones de un chofer en un período (CU-242): nace en borrador. */
export const LiquidationFormModal = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const create = useCreateDriverLiquidation();
  const employees = useEmployees({ page: 0, pageSize: 100 }, { category: 'driver' }, open);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    const today = new Date();
    reset({
      employeeId: '',
      periodFrom: toIsoDay(new Date(today.getFullYear(), today.getMonth(), 1)),
      periodTo: toIsoDay(today),
    });
  }, [open, reset]);

  const onSubmit = handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: (liquidation) => {
        notify.success('Liquidación creada en borrador');
        onClose();
        navigate(`/finance/liquidations/${liquidation.liquidationId}`);
      },
      onError: notify.error,
    }),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={create.isPending}
      title="Liquidar comisiones"
      description="Toma las comisiones y deducciones del chofer en el período que todavía no están en otra liquidación."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="liquidation-form" loading={create.isPending}>
            Liquidar
          </Button>
        </>
      }
    >
      <form id="liquidation-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Select
            label="Chofer"
            required
            options={[
              { value: '', label: 'Elegí un chofer' },
              ...(employees.data?.rows ?? []).map((e) => ({
                value: e.employeeId,
                label: `${e.firstName} ${e.lastName}`,
              })),
            ]}
            error={errors.employeeId?.message}
            {...register('employeeId')}
          />
        </div>
        <Input label="Desde" type="date" required error={errors.periodFrom?.message} {...register('periodFrom')} />
        <Input label="Hasta" type="date" required error={errors.periodTo?.message} {...register('periodTo')} />
      </form>
    </Modal>
  );
};
