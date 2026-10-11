import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, PhotoPicker, TextArea } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { useCreateClaim } from '../../../services/queries/claims';
import { useUploadPhoto } from '../../../services/queries/photos';
import { toApiError } from '../../../services/api/errors';
import { notify } from '../../../utils/notifications';
import { photoErrorMessage } from '../../../utils/photos';
import { createClaimSchema, type CreateClaimFormValues } from './createClaimSchema';
import { OrderPicker } from './OrderPicker';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Carga de un reclamo en nombre del cliente (soporte telefónico/presencial):
 * `POST /claims`. Swagger confirma que el admin y el super_admin pueden
 * crearlo (`@Auth(CUSTOMER, ADMIN, SUPER_ADMIN)`); con esos roles el body va
 * tal cual, sin forzar el `customerId` al del token como sí pasa con un
 * cliente. El pedido se busca por número o por datos del cliente; el
 * `customerId` sale de ahí, nunca se escribe a mano.
 */
export const CreateClaimModal = ({ open, onClose }: Props) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  // El envío es asíncrono (validación): el estado `isPending` llega tarde para frenar un doble clic o Enter.
  const sending = useRef(false);
  const createClaim = useCreateClaim();
  const uploadPhoto = useUploadPhoto('claim');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateClaimFormValues>({ resolver: zodResolver(createClaimSchema) });

  useEffect(() => {
    if (open) {
      sending.current = false;
      setOrder(null);
      setPhoto(null);
      reset({ reason: '', description: '' });
    }
  }, [open, reset]);

  if (!open) return null;

  const onSubmit = handleSubmit((values) => {
    if (!order?.customer || sending.current) return;
    sending.current = true;
    createClaim.mutate(
      {
        orderId: order.order_id,
        customerId: order.customer.user_id,
        reason: values.reason,
        description: values.description,
      },
      {
        onSuccess: (claim) => {
          if (!photo) {
            notify.success('Reclamo cargado');
            onClose();
            return;
          }
          // El reclamo ya existe: si la foto falla se avisa y se sube después desde el detalle.
          uploadPhoto.mutate(
            { id: claim.claim_id, file: photo },
            {
              onSuccess: () => notify.success('Reclamo cargado con su foto'),
              onError: (error) => {
                const { status, message } = toApiError(error);
                notify.error(
                  new Error(
                    `El reclamo se registró, pero la foto no se pudo subir: ${photoErrorMessage('claim', status, message)}`,
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
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cargar reclamo a nombre del cliente"
      description="Para atención por teléfono o en el local. El cliente y su pedido salen de la búsqueda."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="claim-create"
            loading={createClaim.isPending || uploadPhoto.isPending}
            disabled={!order?.customer}
            title={order && !order.customer ? 'Este pedido no tiene un cliente asociado' : undefined}
          >
            Cargar reclamo
          </Button>
        </>
      }
    >
      <form id="claim-create" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <OrderPicker selected={order} onSelect={setOrder} />
        {order && !order.customer && (
          <p className="text-xs text-danger">Este pedido no tiene un cliente asociado: elegí otro.</p>
        )}
        <Input
          label="Motivo"
          required
          placeholder="Ej: Fuga de gas"
          error={errors.reason?.message}
          {...register('reason')}
        />
        <TextArea
          label="Descripción"
          required
          rows={4}
          placeholder="Detalle de lo que pasó"
          error={errors.description?.message}
          {...register('description')}
        />
        <PhotoPicker kind="claim" file={photo} onChange={setPhoto} />
      </form>
    </Modal>
  );
};
