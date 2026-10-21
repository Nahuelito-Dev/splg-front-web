import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge, Button, Modal, FormInput, FormTextArea, FormSelect, Form } from '../../../common/components/ui';
import type { Cylinder } from '../../../services/api/types';
import { useTransitionCylinder } from '../../../services/queries/physicalCylinders';
import { CYLINDER_STATE, labelOf } from '../../../utils/statusLabels';
import { notify } from '../../../utils/notifications';
import { NEXT_STATES } from '../cylinderTransitions';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schema = z
  .object({
    toState: z.enum(['in_depot', 'filled', 'dispatched', 'with_customer', 'empty_returned']),
    orderId: z.union([z.literal(''), z.string().trim().regex(UUID_RE, 'Tiene que ser un UUID válido')]),
    note: z.string().trim().max(500, 'Máximo 500 caracteres'),
  })
  .refine((v) => v.toState !== 'with_customer' || v.orderId !== '', {
    path: ['orderId'],
    message: 'Indicá el pedido: el envase queda a nombre de su cliente',
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  cylinder: Cylinder | null;
}

/** Necesita el pedido asociado para poder registrar quién lo tiene. */
const NEEDS_ORDER: Cylinder['state'][] = ['dispatched', 'with_customer'];

export const TransitionModal = ({ open, onClose, cylinder }: Props) => {
  const transitionCylinder = useTransitionCylinder();
  const methods = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { reset, watch } = methods;

  const options = useMemo(() => (cylinder ? NEXT_STATES[cylinder.state] : []), [cylinder]);

  useEffect(() => {
    if (open && cylinder) reset({ toState: options[0], orderId: '', note: '' });
  }, [open, cylinder, options, reset]);

  if (!cylinder) return null;

  const toState = watch('toState');

  const onSubmit = ({ toState: nextState, orderId, note }: FormValues) =>
    transitionCylinder.mutate(
      {
        id: cylinder.cylinder_id,
        body: { toState: nextState, orderId: orderId || undefined, note: note || undefined },
      },
      {
        onSuccess: () => {
          notify.success('Envase movido');
          onClose();
        },
        onError: notify.error,
      },
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mover envase"
      description={`Serial ${cylinder.serial}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="cylinder-transition-form"
            loading={transitionCylinder.isPending}
            disabled={options.length === 0}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <Form methods={methods} id="cylinder-transition-form" onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted">
          Estado actual: <Badge label={labelOf(CYLINDER_STATE, cylinder.state)} />
        </div>

        {options.length > 0 ? (
          <FormSelect
            name="toState"
            label="Nuevo estado"
            options={options.map((s) => ({ value: s, label: labelOf(CYLINDER_STATE, s).text }))}
          />
        ) : (
          <p className="text-sm text-muted">Este envase no tiene próximos estados válidos.</p>
        )}

        {NEEDS_ORDER.includes(toState) && (
          <FormInput
            name="orderId"
            label={toState === 'with_customer' ? 'Pedido asociado (UUID)' : 'Pedido asociado (UUID, opcional)'}
            placeholder="Id del pedido"
          />
        )}

        <FormTextArea
          name="note"
          label="Nota (opcional)"
          placeholder="Ej: recargada en planta / entregada al cliente…"
        />
      </Form>
    </Modal>
  );
};
