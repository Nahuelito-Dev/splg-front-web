import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Form, FormError, FormTextArea, Modal } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import { clearIntent, intentKey } from '../../../services/api/idempotency';
import { MESSAGE_MAX } from '../../../services/api/supportChat';
import type { MessageDto } from '../../../services/api/types';
import { useStartPlatformChat } from '../../../services/queries/supportChat';
import { CompanySelect } from '../components/CompanySelect';

/** Las reglas de `StartPlatformChatDto`. */
const schema = z.object({
  distributorId: z.string().uuid('Elegí la empresa'),
  body: z.string().trim().min(1, 'Escribí el mensaje').max(MESSAGE_MAX, `Hasta ${MESSAGE_MAX} caracteres`),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onStarted: (message: MessageDto) => void;
}

/** «Escribirle a una empresa»: en su chat abierto o en uno nuevo, que queda atendido por quien escribe. */
export const StartChatModal = ({ open, onClose, onStarted }: Props) => {
  const start = useStartPlatformChat();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { distributorId: '', body: '' } });
  const { reset, watch, setValue } = methods;
  const distributorId = watch('distributorId');

  useEffect(() => {
    if (open) {
      reset({ distributorId: '', body: '' });
      setServerError(null);
    }
  }, [open, reset]);

  const onSubmit = async (values: Values) => {
    setServerError(null);
    const scope = 'platform-start-chat';
    try {
      const message = await start.mutateAsync({
        distributorId: values.distributorId,
        firstMessage: { clientMessageId: intentKey(scope, values), body: values.body.trim() },
      });
      clearIntent(scope);
      onStarted(message);
    } catch (error) {
      setServerError(errorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={start.isPending}
      title="Escribirle a una empresa"
      description="Se escribe en su chat abierto o en uno nuevo, atendido por vos."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={start.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="start-chat" loading={start.isPending}>
            Enviar
          </Button>
        </>
      }
    >
      <Form methods={methods} id="start-chat" onSubmit={onSubmit} className="grid gap-4">
        {serverError && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        <div>
          <CompanySelect
            value={distributorId}
            onChange={(id) => setValue('distributorId', id, { shouldValidate: true })}
          />
          <FormError name="distributorId" />
        </div>
        <FormTextArea name="body" label="Mensaje" required rows={4} maxLength={MESSAGE_MAX} />
      </Form>
    </Modal>
  );
};
