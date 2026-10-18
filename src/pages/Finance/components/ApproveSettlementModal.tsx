import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, Select, TextArea } from '../../../common/components/ui';
import type { DriverSettlementDetail } from '../../../services/api/types';
import { useApproveDriverSettlement, useCashBoxOptions } from '../../../services/queries/finance';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { optionalText } from '../financeSchemas';

const schema = z.object({
  cashBoxId: z.string().min(1, 'Elegí la caja donde entra el efectivo'),
  differenceResolution: z.enum(['', 'absorbed', 'charged_to_driver']),
  notes: optionalText(500),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  settlement: DriverSettlementDetail;
}

/** Aprobar la rendición (CU-233): a qué caja entra y, si hay diferencia, cómo se resuelve. */
export const ApproveSettlementModal = ({ open, onClose, settlement }: Props) => {
  const approve = useApproveDriverSettlement();
  const boxes = useCashBoxOptions({ enabled: open });
  const difference = settlement.difference ?? 0;
  const shortage = difference < 0;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) reset({ cashBoxId: '', differenceResolution: '', notes: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit((values) => {
    if (difference !== 0 && !values.differenceResolution) {
      setError('differenceResolution', { message: 'Indicá cómo se resuelve la diferencia' });
      return;
    }
    approve.mutate(
      {
        id: settlement.settlementId,
        body: {
          cashBoxId: values.cashBoxId,
          differenceResolution: values.differenceResolution || undefined,
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          notify.success('Rendición aprobada');
          onClose();
        },
        onError: notify.error,
      },
    );
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={approve.isPending}
      title="Aprobar la rendición"
      description={`Entran ${formatCurrency(settlement.declaredCash ?? 0)} a la caja que elijas.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="approve-settlement-form" loading={approve.isPending}>
            Aprobar rendición
          </Button>
        </>
      }
    >
      <form id="approve-settlement-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4" noValidate>
        <Select
          label="Caja destino"
          required
          options={[
            { value: '', label: 'Elegí una caja' },
            ...(boxes.data?.data ?? []).map((b) => ({ value: b.cashBoxId, label: b.name })),
          ]}
          hint="Si exige sesión, tiene que estar abierta."
          error={errors.cashBoxId?.message}
          {...register('cashBoxId')}
        />
        {difference !== 0 && (
          <Select
            label={
              shortage ? `Faltante de ${formatCurrency(-difference)}` : `Sobrante de ${formatCurrency(difference)}`
            }
            required
            options={[
              { value: '', label: 'Elegí cómo se resuelve' },
              { value: 'absorbed', label: 'La distribuidora lo absorbe' },
              ...(shortage
                ? [{ value: 'charged_to_driver', label: 'A cargo del chofer (se descuenta de sus comisiones)' }]
                : []),
            ]}
            error={errors.differenceResolution?.message}
            {...register('differenceResolution')}
          />
        )}
        <TextArea label="Notas (opcional)" maxLength={500} error={errors.notes?.message} {...register('notes')} />
      </form>
    </Modal>
  );
};
