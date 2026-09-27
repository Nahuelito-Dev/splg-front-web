import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal, TextArea } from '../../../common/components/ui';
import { useAssignCylinders } from '../../../services/queries/physicalCylinders';
import { notify } from '../../../utils/notifications';
import { parseSerials } from '../parseSerials';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schema = z.object({
  orderId: z.string().trim().regex(UUID_RE, 'Tiene que ser el UUID del pedido'),
  serials: z.string().trim().min(1, 'Ingresá al menos un serial'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Asigna envases (por serial) a un pedido y los despacha: `filled` → `dispatched`. Los seriales deben estar llenos. */
export const AssignCylindersModal = ({ open, onClose }: Props) => {
  const assignCylinders = useAssignCylinders();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { orderId: '', serials: '' } });

  useEffect(() => {
    if (open) reset({ orderId: '', serials: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit(({ orderId, serials }) =>
    assignCylinders.mutate(
      { orderId, serials: parseSerials(serials) },
      {
        onSuccess: (assigned) => {
          notify.success(`${assigned.length} envase(s) despachados`);
          onClose();
        },
        onError: notify.error,
      },
    ),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignar envases a un pedido"
      description="Los envases tienen que estar en estado lleno; quedan despachados."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="assign-cylinders-form" loading={assignCylinders.isPending}>
            Asignar y despachar
          </Button>
        </>
      }
    >
      <form id="assign-cylinders-form" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <Input
          label="Pedido (UUID)"
          required
          placeholder="Id del pedido"
          error={errors.orderId?.message}
          {...register('orderId')}
        />
        <TextArea
          label="Seriales"
          required
          hint="Uno por línea o separados por coma."
          placeholder={'SN-000123\nSN-000124'}
          error={errors.serials?.message}
          {...register('serials')}
        />
      </form>
    </Modal>
  );
};
