import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button, Form, FormInput, Modal } from '../../../common/components/ui';
import { useCreateMpReconciliation } from '../../../services/queries/mpReconciliation';
import { daysAgo } from '../../../utils/dates';
import { notify } from '../../../utils/notifications';
import { MAX_DAYS, newReconciliationSchema } from '../mpReconciliationRules';

interface Values {
  from: string;
  to: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Pide la conciliación de un rango: Mercado Pago arma el reporte de liberaciones y la pantalla de la corrida lo espera. */
export const MpReconciliationFormModal = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const create = useCreateMpReconciliation();
  const today = daysAgo(0);
  const schema = useMemo(() => newReconciliationSchema(today), [today]);
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset } = methods;

  useEffect(() => {
    if (open) reset({ from: daysAgo(30), to: daysAgo(0) });
  }, [open, reset]);

  const onSubmit = (values: Values) =>
    create.mutate(values, {
      onSuccess: (run) => {
        notify.success('Pedimos el reporte a Mercado Pago');
        onClose();
        navigate(`/finance/mp-reconciliation/${run.reconciliationId}`);
      },
      onError: notify.error,
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={create.isPending}
      title="Conciliar con Mercado Pago"
      description={`Le pedimos a Mercado Pago el reporte de liberaciones del rango (hasta ${MAX_DAYS} días) y lo comparamos con la caja de Mercado Pago. Nada se asienta solo: vos elegís qué diferencias aplicar.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="mp-reconciliation-form" loading={create.isPending}>
            Pedir el reporte
          </Button>
        </>
      }
    >
      <Form methods={methods} id="mp-reconciliation-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormInput name="from" label="Desde" type="date" required max={today} />
        <FormInput name="to" label="Hasta" type="date" required max={today} />
      </Form>
    </Modal>
  );
};
