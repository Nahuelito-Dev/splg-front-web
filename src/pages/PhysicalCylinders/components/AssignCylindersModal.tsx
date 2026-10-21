import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, FormInput, FormTextArea, Form } from '../../../common/components/ui';
import { useAssignCylinders } from '../../../services/queries/physicalCylinders';
import { notify } from '../../../utils/notifications';
import { parseSerials, serialListSchema } from '../parseSerials';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schema = z.object({
  orderId: z.string().trim().regex(UUID_RE, 'Tiene que ser el UUID del pedido'),
  serials: serialListSchema,
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Asigna envases (por serial) a un pedido y los despacha: `filled` → `dispatched`. Los seriales deben estar llenos. */
export const AssignCylindersModal = ({ open, onClose }: Props) => {
  const assignCylinders = useAssignCylinders();
  const methods = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { orderId: '', serials: '' } });
  const { reset } = methods;

  useEffect(() => {
    if (open) reset({ orderId: '', serials: '' });
  }, [open, reset]);

  const onSubmit = ({ orderId, serials }: FormValues) =>
    assignCylinders.mutate(
      { orderId, serials: parseSerials(serials) },
      {
        onSuccess: (assigned) => {
          notify.success(`${assigned.length} envase(s) despachados`);
          onClose();
        },
        onError: notify.error,
      },
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
      <Form methods={methods} id="assign-cylinders-form" onSubmit={onSubmit} className="space-y-4">
        <FormInput name="orderId" label="Pedido (UUID)" required placeholder="Id del pedido" />
        <FormTextArea
          name="serials"
          label="Seriales"
          required
          hint="Uno por línea o separados por coma."
          placeholder={'SN-000123\nSN-000124'}
        />
      </Form>
    </Modal>
  );
};
