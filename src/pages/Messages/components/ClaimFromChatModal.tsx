import { claimFromChatSchema, type ClaimFromChatValues } from '../../../features/chat/inbox/inboxSchemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormInput, FormSelect, FormTextArea, Modal } from '../../../common/components/ui';
import { CLAIM_DESCRIPTION_MAX, CLAIM_REASON_MAX } from '../../../services/api/inbox';
import type { InboxConversation } from '../../../services/api/types';
import { useCustomerOrders } from '../../../services/queries/customers';
import { useClaimFromConversation } from '../../../services/queries/inbox';
import { formatDate, formatShortId } from '../../../utils/format';
import { labelOf, ORDER_STATUS } from '../../../utils/statusLabels';
import { notify } from '../../../utils/notifications';

interface Props {
  conversation: InboxConversation | null;
  onClose: () => void;
  onCreated: (claimId: string) => void;
}

/**
 * «Crear reclamo» desde el hilo de un cliente (§4.3): lo crea el servicio de reclamos de siempre y la conversación
 * queda vinculada. En una conversación por pedido el pedido es ése; en una general se elige entre los del cliente.
 */
export const ClaimFromChatModal = ({ conversation, onClose, onCreated }: Props) => {
  const open = Boolean(conversation);
  const needsOrder = conversation?.subjectType !== 'order';
  const customerId = needsOrder ? (conversation?.customer?.id ?? undefined) : undefined;
  const orders = useCustomerOrders(open ? customerId : undefined, { page: 0, pageSize: 20 });
  const create = useClaimFromConversation();
  const methods = useForm<ClaimFromChatValues>({ resolver: zodResolver(claimFromChatSchema(needsOrder)) });
  const { reset } = methods;

  useEffect(() => {
    if (open) reset({ reason: '', description: '', orderId: '' });
  }, [open, reset]);

  if (!conversation) return null;

  const onSubmit = (values: ClaimFromChatValues) => {
    if (create.isPending) return;
    create.mutate(
      {
        id: conversation.id,
        body: {
          reason: values.reason.trim(),
          description: values.description.trim(),
          ...(needsOrder && values.orderId ? { orderId: values.orderId } : {}),
        },
      },
      {
        onSuccess: ({ claimId }) => {
          notify.success('Reclamo creado y vinculado a la conversación');
          onCreated(claimId);
        },
        onError: (error) => notify.error(error),
      },
    );
  };

  const list = orders.data?.orders ?? [];
  const orderOptions = [
    { value: '', label: orders.isPending ? 'Cargando pedidos…' : list.length ? 'Elegí un pedido' : 'Sin pedidos' },
    ...list.map((order) => ({
      value: order.order_id,
      label: `${formatShortId(order.order_id)} · ${formatDate(order.created_at)} · ${labelOf(ORDER_STATUS, order.status).text}`,
    })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={create.isPending}
      title="Crear reclamo desde la conversación"
      description={
        needsOrder
          ? 'El reclamo sigue su propio circuito en «Reclamos»; la conversación queda vinculada.'
          : `Del pedido #${conversation.order?.number ?? ''}. El reclamo sigue su propio circuito en «Reclamos».`
      }
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="claim-from-chat" loading={create.isPending}>
            Crear reclamo
          </Button>
        </>
      }
    >
      <Form methods={methods} id="claim-from-chat" onSubmit={onSubmit} className="space-y-4">
        {needsOrder && <FormSelect name="orderId" label="Pedido reclamado" required options={orderOptions} />}
        {needsOrder && orders.error && (
          <p role="alert" className="text-xs text-danger">
            No se pudieron cargar los pedidos del cliente.
          </p>
        )}
        <FormInput
          name="reason"
          label="Motivo"
          required
          maxLength={CLAIM_REASON_MAX}
          placeholder="Ej: Garrafa con pérdida"
        />
        <FormTextArea
          name="description"
          label="Descripción"
          required
          rows={4}
          maxLength={CLAIM_DESCRIPTION_MAX}
          placeholder="Lo que contó el cliente en la conversación"
        />
      </Form>
    </Modal>
  );
};
