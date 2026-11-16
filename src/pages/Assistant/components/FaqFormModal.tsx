import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, Modal } from '../../../common/components/ui';
import type { AssistantFaq } from '../../../services/api/types';
import { useCreateCompanyFaq, useUpdateCompanyFaq } from '../../../services/queries/assistant';
import { notify } from '../../../utils/notifications';
import { faqSchema, toFaqBody, type FaqFormValues } from '../faqRules';
import { useFaqServerErrors } from '../useFaqServerErrors';
import { FaqFormError } from './FormError';
import { FaqTextFields } from './FaqTextFields';

interface Props {
  open: boolean;
  onClose: () => void;
  /** La que se edita; `null` para una nueva. */
  faq: AssistantFaq | null;
}

const FIELDS: Array<keyof FaqFormValues> = ['question', 'answer'];

/** Alta o edición de una pregunta frecuente de la distribuidora. */
export const FaqFormModal = ({ open, onClose, faq }: Props) => {
  const create = useCreateCompanyFaq();
  const update = useUpdateCompanyFaq();
  const methods = useForm<FaqFormValues>({ resolver: zodResolver(faqSchema) });
  const { reset, setError } = methods;
  const { formError, apply, clear } = useFaqServerErrors(setError, FIELDS);
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    reset({ question: faq?.question ?? '', answer: faq?.answer ?? '' });
    clear();
  }, [open, faq, reset, clear]);

  const onSubmit = (values: FaqFormValues) => {
    clear();
    const options = {
      onSuccess: () => {
        notify.success(faq ? 'Pregunta actualizada' : 'Pregunta agregada');
        onClose();
      },
      onError: apply,
    };
    const body = toFaqBody(values);
    if (faq) update.mutate({ id: faq.id, body }, options);
    else create.mutate(body, options);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={pending}
      size="md"
      title={faq ? 'Editar pregunta frecuente' : 'Nueva pregunta frecuente'}
      description="El asistente responde con este texto, identificándose como respuesta automática."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="assistant-faq-form" loading={pending}>
            {faq ? 'Guardar cambios' : 'Agregar pregunta'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="assistant-faq-form" onSubmit={onSubmit} className="grid gap-4">
        <FaqTextFields />
        <FaqFormError message={formError} />
      </Form>
    </Modal>
  );
};
