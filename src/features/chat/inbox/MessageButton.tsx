import { firstMessageSchema, type FirstMessageValues } from './inboxSchemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { MessageSquareText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button, Form, FormTextArea, Modal, cx } from '../../../common/components/ui';
import type { InboxChannel } from '../../../services/api/inbox';
import { MESSAGE_MAX } from '../../../services/api/supportChat';
import { useOpenConversation } from '../../../services/queries/inbox';
import { notify } from '../../../utils/notifications';
import { useIntentId } from './useIntentId';
import { messageHref } from '../routes';
import { useInboxAccess } from '../useInboxAccess';

/** A quién se le escribe: un cliente o un chofer (conversación general), o alguien de un pedido. */
export type MessageTarget =
  | { kind: 'customer'; userId: string; name: string }
  | { kind: 'driver'; userId: string; name: string }
  | { kind: 'order'; orderId: string; label: string; customerName: string | null; driverName: string | null };

const CHANNEL_OF = { customer: 'staff_customer', driver: 'staff_driver' } as const;

interface ModalProps {
  target: MessageTarget;
  open: boolean;
  onClose: () => void;
  /** Canales que atiende quien escribe. */
  channels: InboxChannel[];
}

/**
 * Escribirle a alguien desde otra pantalla (§15.2): si ya hay una conversación abierta del mismo tema, el mensaje va
 * ahí; si no, se abre. Al terminar lleva a la bandeja con la conversación elegida.
 */
export const NewConversationModal = ({ target, open, onClose, channels }: ModalProps) => {
  const navigate = useNavigate();
  const openConversation = useOpenConversation();
  const orderChoices =
    target.kind === 'order'
      ? (
          [
            ['staff_customer', target.customerName ? `Cliente: ${target.customerName}` : null],
            ['staff_driver', target.driverName ? `Chofer: ${target.driverName}` : null],
          ] as const
        ).filter(([channel, label]) => label && channels.includes(channel))
      : [];
  const [channel, setChannel] = useState<InboxChannel>(
    target.kind === 'order' ? (orderChoices[0]?.[0] ?? 'staff_customer') : CHANNEL_OF[target.kind],
  );
  const intent = useIntentId();
  const methods = useForm<FirstMessageValues>({
    resolver: zodResolver(firstMessageSchema),
    defaultValues: { body: '' },
  });
  const { reset } = methods;

  useEffect(() => {
    if (open) {
      reset({ body: '' });
      intent.reset();
    }
  }, [open, reset, intent]);

  const onSubmit = (values: FirstMessageValues) => {
    if (openConversation.isPending) return;
    const text = values.body.trim();
    const firstMessage = { clientMessageId: intent.idFor(JSON.stringify([channel, text])), body: text };
    const body =
      target.kind === 'order'
        ? { channel, subjectType: 'order' as const, orderId: target.orderId, firstMessage }
        : target.kind === 'customer'
          ? {
              channel: 'staff_customer' as const,
              subjectType: 'general' as const,
              customerId: target.userId,
              firstMessage,
            }
          : {
              channel: 'staff_driver' as const,
              subjectType: 'general' as const,
              driverId: target.userId,
              firstMessage,
            };
    openConversation.mutate(body, {
      onSuccess: ({ conversation }) => {
        notify.success('Mensaje enviado');
        onClose();
        navigate(messageHref(conversation.id));
      },
      onError: (error) => notify.error(error),
    });
  };

  const title =
    target.kind === 'order'
      ? `Mensaje sobre el ${target.label}`
      : `Mensaje a ${target.name || (target.kind === 'customer' ? 'el cliente' : 'el chofer')}`;
  const noChoice = target.kind === 'order' && orderChoices.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={openConversation.isPending}
      title={title}
      description="Si ya hay una conversación abierta del mismo tema, el mensaje se suma a ella. Ve la marca de la empresa, no tu nombre."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={openConversation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="new-conversation" loading={openConversation.isPending} disabled={noChoice}>
            Enviar
          </Button>
        </>
      }
    >
      <Form methods={methods} id="new-conversation" onSubmit={onSubmit} className="space-y-4">
        {target.kind === 'order' &&
          (noChoice ? (
            <p className="text-sm text-muted">Este pedido no tiene a quién escribirle desde tus canales.</p>
          ) : (
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">¿A quién?</legend>
              <div className="flex flex-wrap gap-2">
                {orderChoices.map(([value, label]) => (
                  <label
                    key={value}
                    className={cx(
                      'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                      channel === value ? 'border-primary-edge bg-primary-soft text-ink' : 'border-outline text-ink-2',
                    )}
                  >
                    <input
                      type="radio"
                      name="channel"
                      className="accent-primary"
                      checked={channel === value}
                      onChange={() => setChannel(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        <FormTextArea name="body" label="Mensaje" required rows={4} maxLength={MESSAGE_MAX} />
      </Form>
    </Modal>
  );
};

/**
 * El botón «Mensaje» de las fichas (cliente, chofer, pedido). Sólo aparece si quien mira atiende ese canal (y está en
 * su empresa): el resto no tiene la bandeja.
 */
export const MessageButton = ({ target, size = 'sm' }: { target: MessageTarget; size?: 'sm' | 'md' }) => {
  const access = useInboxAccess();
  const [open, setOpen] = useState(false);
  const channels: InboxChannel[] = [
    ...(access.customers ? (['staff_customer'] as const) : []),
    ...(access.drivers ? (['staff_driver'] as const) : []),
  ];
  const allowed =
    target.kind === 'order'
      ? (access.customers && Boolean(target.customerName)) || (access.drivers && Boolean(target.driverName))
      : channels.includes(CHANNEL_OF[target.kind]);
  if (!allowed) return null;
  return (
    <>
      <Button variant="secondary" size={size} icon={<MessageSquareText />} onClick={() => setOpen(true)}>
        Mensaje
      </Button>
      {open && <NewConversationModal target={target} open={open} onClose={() => setOpen(false)} channels={channels} />}
    </>
  );
};
