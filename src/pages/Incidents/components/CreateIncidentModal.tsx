import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select, TextArea } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { useCreateIncident } from '../../../services/queries/incidents';
import { notify } from '../../../utils/notifications';
import { INCIDENT_TYPE } from '../../../utils/statusLabels';
import { createIncidentSchema, type CreateIncidentFormValues } from './createIncidentSchema';
import { OrderPicker } from './OrderPicker';

const TYPE_OPTIONS = Object.entries(INCIDENT_TYPE).map(([value, label]) => ({ value, label: label.text }));

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Registrar una incidencia de reparto desde soporte (por teléfono, sin que
 * el chofer la haya cargado): `POST /incidents`. Swagger la deja crear a
 * `delivery`, `admin` y `super_admin`; para estos dos últimos no exige que
 * el pedido esté asignado a nadie en particular (esa validación es sólo para
 * el chofer). `reportedBy` queda con el id de quien la carga (el admin), no
 * con el del chofer del reparto.
 */
export const CreateIncidentModal = ({ open, onClose }: Props) => {
  const [order, setOrder] = useState<Order | null>(null);
  const createIncident = useCreateIncident();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateIncidentFormValues>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: { type: 'other' },
  });

  useEffect(() => {
    if (open) {
      setOrder(null);
      reset({ type: 'other', description: '', photoUrl: '' });
    }
  }, [open, reset]);

  if (!open) return null;

  const onSubmit = handleSubmit((values) => {
    if (!order) return;
    createIncident.mutate(
      {
        orderId: order.order_id,
        type: values.type,
        description: values.description,
        photoUrl: values.photoUrl || undefined,
      },
      {
        onSuccess: () => {
          notify.success('Incidencia registrada');
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
      title="Registrar incidencia"
      description="Para cuando soporte se entera de un problema de reparto sin que lo haya cargado el chofer."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="incident-create" loading={createIncident.isPending} disabled={!order}>
            Registrar incidencia
          </Button>
        </>
      }
    >
      <form id="incident-create" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <OrderPicker selected={order} onSelect={setOrder} />
        <Select label="Tipo de problema" required options={TYPE_OPTIONS} {...register('type')} />
        <TextArea
          label="Descripción"
          required
          rows={4}
          placeholder="Detalle de lo que pasó"
          error={errors.description?.message}
          {...register('description')}
        />
        <Input
          label="Foto (URL, opcional)"
          placeholder="https://…"
          hint="El panel no sube archivos: si hay una foto, pegá el link donde ya está alojada"
          error={errors.photoUrl?.message}
          {...register('photoUrl')}
        />
      </form>
    </Modal>
  );
};
