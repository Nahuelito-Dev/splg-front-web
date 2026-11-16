import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormCheckbox, FormInput, FormSelect, FormTextArea, Modal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import { MESSAGE_MAX, SUBJECT_MAX } from '../../../services/api/supportChat';
import type { Ticket } from '../../../services/api/types';
import { useOpenTicketFromChat, type ChatSide } from '../../../services/queries/supportChat';
import { categoryOptions, openFromChatSchema, priorityOptions, type OpenFromChatValues } from '../ticketForms';

interface Props {
  open: boolean;
  onClose: () => void;
  side: ChatSide;
  conversationId: string;
  range: { fromSeq: number; toSeq: number; size: number };
  onCreated: (ticket: Ticket) => void;
}

const EMPTY: OpenFromChatValues = {
  category: 'technical',
  priority: 'normal',
  subject: '',
  note: '',
  assignToMe: true,
};

/** «Abrir ticket» con los mensajes elegidos del chat: se copian al hilo del ticket y el chat queda igual. */
export const OpenTicketModal = ({ open, onClose, side, conversationId, range, onCreated }: Props) => {
  const mutation = useOpenTicketFromChat(side);
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<OpenFromChatValues>({ resolver: zodResolver(openFromChatSchema), defaultValues: EMPTY });
  const { reset } = methods;

  useEffect(() => {
    if (open) {
      reset(EMPTY);
      setServerError(null);
    }
  }, [open, reset]);

  const onSubmit = async (values: OpenFromChatValues) => {
    setServerError(null);
    try {
      const ticket = await mutation.mutateAsync({
        conversationId,
        body: {
          category: values.category,
          priority: values.priority,
          subject: values.subject.trim(),
          fromSeq: range.fromSeq,
          toSeq: range.toSeq,
          note: values.note.trim() || undefined,
          ...(side === 'platform' ? { assignToMe: values.assignToMe } : {}),
        },
      });
      onCreated(ticket);
    } catch (error) {
      setServerError(errorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={mutation.isPending}
      title="Abrir ticket con estos mensajes"
      description={`Se copian ${range.size} ${range.size === 1 ? 'mensaje' : 'mensajes'} del chat al ticket (del número ${range.fromSeq} al ${range.toSeq}). El chat queda igual.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="open-ticket" loading={mutation.isPending}>
            Abrir ticket
          </Button>
        </>
      }
    >
      <Form methods={methods} id="open-ticket" onSubmit={onSubmit} className="grid gap-4">
        {serverError && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        <FormInput
          name="subject"
          label="Asunto"
          required
          maxLength={SUBJECT_MAX}
          placeholder="Qué pasa, en pocas palabras"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect name="category" label="Categoría" required options={categoryOptions} />
          <FormSelect name="priority" label="Prioridad" required options={priorityOptions} />
        </div>
        <FormTextArea
          name="note"
          label="Primer mensaje del ticket (opcional)"
          rows={3}
          maxLength={MESSAGE_MAX}
          placeholder="Algo más para sumar a lo que se cita"
        />
        {side === 'platform' && <FormCheckbox name="assignToMe" label="Asignármelo" />}
      </Form>
    </Modal>
  );
};
