import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormError, FormInput, FormSelect, FormTextArea, Modal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import { clearIntent, intentKey } from '../../../services/api/idempotency';
import { MESSAGE_MAX, SUBJECT_MAX } from '../../../services/api/supportChat';
import type { Ticket } from '../../../services/api/types';
import { useCreateCompanyTicket, useCreatePlatformTicket, type ChatSide } from '../../../services/queries/supportChat';
import { categoryOptions, newTicketSchema, priorityOptions, type NewTicketValues } from '../ticketForms';

interface Props {
  open: boolean;
  onClose: () => void;
  side: ChatSide;
  onCreated: (ticket: Ticket) => void;
  /** Del lado de la plataforma: el selector de empresa (recibe el valor y cómo cambiarlo). */
  renderCompany?: (value: string, onChange: (id: string) => void) => ReactNode;
}

const EMPTY: NewTicketValues = { distributorId: '', category: 'technical', priority: 'normal', subject: '', body: '' };

/**
 * «Nuevo ticket». El primer mensaje lleva un `clientMessageId` atado a lo que se completó: reintentar con los mismos
 * datos devuelve el ticket ya creado en vez de abrir otro.
 */
export const NewTicketModal = ({ open, onClose, side, onCreated, renderCompany }: Props) => {
  const company = useCreateCompanyTicket();
  const platform = useCreatePlatformTicket();
  const mutation = side === 'company' ? company : platform;
  const schema = useMemo(() => newTicketSchema(side === 'platform'), [side]);
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<NewTicketValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const { reset, watch, setValue } = methods;
  const distributorId = watch('distributorId');

  useEffect(() => {
    if (open) {
      reset(EMPTY);
      setServerError(null);
    }
  }, [open, reset]);

  const onSubmit = async (values: NewTicketValues) => {
    setServerError(null);
    const scope = `new-ticket:${side}`;
    const base = {
      category: values.category,
      priority: values.priority,
      subject: values.subject.trim(),
      firstMessage: { clientMessageId: intentKey(scope, values), body: values.body.trim() },
    };
    try {
      const ticket =
        side === 'company'
          ? await company.mutateAsync(base)
          : await platform.mutateAsync({ ...base, distributorId: values.distributorId });
      clearIntent(scope);
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
      title="Nuevo ticket"
      description={
        side === 'company'
          ? 'Para lo que necesita seguimiento: un error a investigar, una factura, una función nueva.'
          : 'Un ticket hacia una empresa: queda esperando su respuesta y asignado a vos.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="new-ticket" loading={mutation.isPending}>
            Abrir ticket
          </Button>
        </>
      }
    >
      <Form methods={methods} id="new-ticket" onSubmit={onSubmit} className="grid gap-4">
        {serverError && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        {renderCompany && (
          <div>
            {renderCompany(distributorId, (id) => setValue('distributorId', id, { shouldValidate: true }))}
            <FormError name="distributorId" />
          </div>
        )}
        <FormInput name="subject" label="Asunto" required maxLength={SUBJECT_MAX} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect name="category" label="Categoría" required options={categoryOptions} />
          <FormSelect name="priority" label="Prioridad" required options={priorityOptions} />
        </div>
        <FormTextArea name="body" label="Mensaje" required rows={4} maxLength={MESSAGE_MAX} />
      </Form>
    </Modal>
  );
};
