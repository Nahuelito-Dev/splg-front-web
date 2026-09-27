import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, TextArea } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { useCreateClaim } from '../../../services/queries/claims';
import { notify } from '../../../utils/notifications';
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
  const createClaim = useCreateClaim();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateClaimFormValues>({ resolver: zodResolver(createClaimSchema) });

  useEffect(() => {
    if (open) {
      setOrder(null);
      reset({ reason: '', description: '', photoUrl: '' });
    }
  }, [open, reset]);

  if (!open) return null;

  const onSubmit = handleSubmit((values) => {
    if (!order?.customer) return;
    createClaim.mutate(
      {
        orderId: order.order_id,
        customerId: order.customer.user_id,
        reason: values.reason,
        description: values.description,
        photoUrl: values.photoUrl || undefined,
      },
      {
        onSuccess: () => {
          notify.success('Reclamo cargado');
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
            loading={createClaim.isPending}
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
