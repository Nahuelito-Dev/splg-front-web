import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, PhotoPicker, FormTextArea, FormSelect, Form } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { useCreateIncident } from '../../../services/queries/incidents';
import { useUploadPhoto } from '../../../services/queries/photos';
import { toApiError } from '../../../services/api/errors';
import { notify } from '../../../utils/notifications';
import { photoErrorMessage } from '../../../utils/photos';
import { INCIDENT_TYPE } from '../../../utils/statusLabels';
import { createIncidentSchema, type CreateIncidentFormValues } from './createIncidentSchema';
import { OrderPicker } from './OrderPicker';

/** `unpaid_collection` la abre el sistema cuando el chofer informa un impago: no se carga a mano. */
const TYPE_OPTIONS = Object.entries(INCIDENT_TYPE)
  .filter(([value]) => value !== 'unpaid_collection')
  .map(([value, label]) => ({ value, label: label.text }));

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
  const [photo, setPhoto] = useState<File | null>(null);
  // El envío es asíncrono (validación): el estado `isPending` llega tarde para frenar un doble clic o Enter.
  const sending = useRef(false);
  const createIncident = useCreateIncident();
  const uploadPhoto = useUploadPhoto('incident');
  const methods = useForm<CreateIncidentFormValues>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: { type: 'other' },
  });
  const { reset } = methods;

  useEffect(() => {
    if (open) {
      sending.current = false;
      setOrder(null);
      setPhoto(null);
      reset({ type: 'other', description: '' });
    }
  }, [open, reset]);

  if (!open) return null;

  const onSubmit = (values: CreateIncidentFormValues) => {
    if (!order || sending.current) return;
    sending.current = true;
    createIncident.mutate(
      {
        orderId: order.order_id,
        type: values.type,
        description: values.description,
      },
      {
        onSuccess: (incident) => {
          if (!photo) {
            notify.success('Incidencia registrada');
            onClose();
            return;
          }
          // La incidencia ya existe: si la foto falla se avisa y se sube después desde el detalle.
          uploadPhoto.mutate(
            { id: incident.incident_id, file: photo },
            {
              onSuccess: () => notify.success('Incidencia registrada con su foto'),
              onError: (error) => {
                const { status, message } = toApiError(error);
                notify.error(
                  new Error(
                    `La incidencia se registró, pero la foto no se pudo subir: ${photoErrorMessage('incident', status, message)}`,
                  ),
                );
              },
              onSettled: onClose,
            },
          );
        },
        onError: (error) => {
          sending.current = false;
          notify.error(error);
        },
      },
    );
  };

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
          <Button
            type="submit"
            form="incident-create"
            loading={createIncident.isPending || uploadPhoto.isPending}
            disabled={!order}
          >
            Registrar incidencia
          </Button>
        </>
      }
    >
      <Form methods={methods} id="incident-create" onSubmit={onSubmit} className="space-y-4">
        <OrderPicker selected={order} onSelect={setOrder} />
        <FormSelect name="type" label="Tipo de problema" required options={TYPE_OPTIONS} />
        <FormTextArea name="description" label="Descripción" required rows={4} placeholder="Detalle de lo que pasó" />
        <PhotoPicker kind="incident" file={photo} onChange={setPhoto} />
      </Form>
    </Modal>
  );
};
