import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormCheckbox, FormError, Modal } from '../../../common/components/ui';
import type { UnansweredQuestion } from '../../../services/api/types';
import type { FaqFromUnansweredInput, FaqFromUnansweredResult } from '../../../services/queries/assistantLab';
import { notify } from '../../../utils/notifications';
import { FaqFormError } from '../components/FormError';
import { FaqTextFields } from '../components/FaqTextFields';
import { useFaqServerErrors } from '../useFaqServerErrors';
import { faqFromUnansweredSchema, type FaqFromUnansweredValues } from './labRules';

interface Props {
  /** El grupo del que sale la pregunta; `null` con el diálogo cerrado. */
  item: UnansweredQuestion | null;
  onClose: () => void;
  create: {
    mutate: (
      input: FaqFromUnansweredInput,
      callbacks: { onSuccess?: (result: FaqFromUnansweredResult) => void; onError?: (error: unknown) => void },
    ) => void;
    isPending: boolean;
  };
}

const FORM_ID = 'faq-from-unanswered-form';
const FIELDS: Array<keyof FaqFromUnansweredValues> = ['question', 'answer'];

/** Lo que se avisa al terminar: publicada, borrador a propósito o la pregunta que el grupo ya tenía publicada. */
const announce = ({ published, existing }: FaqFromUnansweredResult) => {
  if (existing) {
    notify.info(
      'Esta pregunta ya estaba publicada en la base: no se cambió. Si querés, editala en «Preguntas frecuentes».',
    );
  } else if (published) {
    notify.success('Pregunta frecuente publicada: el asistente ya la usa');
  } else {
    notify.success('Quedó como borrador: el asistente no la usa hasta que le escribas la respuesta');
  }
};

/**
 * Pasa una pregunta sin respuesta a la base. La pregunta viene como la escribió el cliente: hay que revisarla (puede
 * tener datos personales) y confirmarlo. Sin respuesta queda como borrador; con ella, se publica.
 */
export const FaqFromUnansweredModal = ({ item, onClose, create }: Props) => {
  const methods = useForm<FaqFromUnansweredValues>({ resolver: zodResolver(faqFromUnansweredSchema) });
  const { reset, setError } = methods;
  const { formError, apply, clear } = useFaqServerErrors(setError, FIELDS);

  // Si la respuesta falló, el borrador ya quedó creado: el reintento lo completa en vez de crear otro.
  const [draftId, setDraftId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!item) return;
    reset({ question: item.question, answer: '', reviewed: false });
    clear();
    setDraftId(undefined);
  }, [item, reset, clear]);

  const onSubmit = (values: FaqFromUnansweredValues) => {
    if (!item) return;
    clear();
    create.mutate(
      { id: item.id, question: values.question.trim(), answer: values.answer.trim(), draftId },
      {
        onSuccess: (result) => {
          // El borrador ya quedó creado: se queda abierto con el error para corregir y volver a guardar sobre él.
          if (result.answerError) {
            setDraftId(result.faqId);
            apply(result.answerError);
            return;
          }
          announce(result);
          onClose();
        },
        onError: apply,
      },
    );
  };

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      closeBlocked={create.isPending}
      size="md"
      title="Crear pregunta frecuente"
      description="Revisá la pregunta tal como la escribió la persona: sacale nombres, teléfonos, direcciones o números de pedido. Sin respuesta queda como borrador y el asistente no la usa."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={create.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <Form methods={methods} id={FORM_ID} onSubmit={onSubmit} className="grid gap-4">
        <FaqTextFields answerOptional />
        <div className="grid gap-1">
          <FormCheckbox name="reviewed" label="Revisé la pregunta y no tiene datos personales" />
          <FormError name="reviewed" />
        </div>
        <FaqFormError message={formError} />
      </Form>
    </Modal>
  );
};
