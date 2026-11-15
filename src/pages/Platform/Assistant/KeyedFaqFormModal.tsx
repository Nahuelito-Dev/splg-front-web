import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button, Form, FormInput, Modal } from '../../../common/components/ui';
import { notify } from '../../../utils/notifications';
import { FaqFormError } from '../../Assistant/components/FormError';
import { FaqTextFields } from '../../Assistant/components/FaqTextFields';
import { KEY_MAX, keyedFaqSchema, suggestKey, toFaqBody, type KeyedFaqFormValues } from '../../Assistant/faqRules';
import { useFaqServerErrors } from '../../Assistant/useFaqServerErrors';

/** Una pregunta con clave: de OrixTech o de ejemplo para distribuidoras. */
export interface KeyedFaq {
  id: string;
  key: string;
  question: string;
  answer: string;
}

interface Callbacks {
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

/** Textos de cada catálogo. */
export interface KeyedFaqTexts {
  /** «pregunta de OrixTech», «pregunta de ejemplo». */
  noun: string;
  description: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** La que se edita; `null` para una nueva. */
  faq: KeyedFaq | null;
  texts: KeyedFaqTexts;
  create: { mutate: (body: KeyedFaqFormValues, callbacks: Callbacks) => void; isPending: boolean };
  update: {
    mutate: (variables: { id: string; body: { question: string; answer: string } }, callbacks: Callbacks) => void;
    isPending: boolean;
  };
}

const FIELDS: Array<keyof KeyedFaqFormValues> = ['question', 'answer', 'key'];

/** Alta o edición de una pregunta con clave; la clave se elige al crearla y no cambia. */
export const KeyedFaqFormModal = ({ open, onClose, faq, texts, create, update }: Props) => {
  const methods = useForm<KeyedFaqFormValues>({ resolver: zodResolver(keyedFaqSchema) });
  const { reset, setError, setValue, control, getFieldState, clearErrors } = methods;
  const { formError, apply, clear } = useFaqServerErrors(setError, FIELDS);
  const pending = create.isPending || update.isPending;
  const question = useWatch({ control, name: 'question' });
  // Si se escribió la clave a mano (aunque después se la borre), la sugerencia no la vuelve a pisar.
  const [keyTouched, setKeyTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    reset({ question: faq?.question ?? '', answer: faq?.answer ?? '', key: faq?.key ?? '' });
    setKeyTouched(false);
    clear();
  }, [open, faq, reset, clear]);

  // En el alta se sugiere la clave a partir de la pregunta, hasta que se la escribe a mano.
  useEffect(() => {
    if (faq || !open || keyTouched) return;
    setValue('key', suggestKey(question ?? ''));
    // Una clave nueva ya no es la que el back dijo ocupada: ese error deja de valer.
    if (getFieldState('key').error?.type === 'server') clearErrors('key');
  }, [faq, open, question, keyTouched, setValue, getFieldState, clearErrors]);

  const onSubmit = (values: KeyedFaqFormValues) => {
    clear();
    const callbacks = {
      onSuccess: () => {
        notify.success(faq ? 'Pregunta actualizada' : 'Pregunta agregada');
        onClose();
      },
      onError: apply,
    };
    const text = toFaqBody(values);
    if (faq) update.mutate({ id: faq.id, body: text }, callbacks);
    else create.mutate({ ...text, key: values.key }, callbacks);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={pending}
      size="md"
      title={faq ? `Editar ${texts.noun}` : `Nueva ${texts.noun}`}
      description={texts.description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="keyed-faq-form" loading={pending}>
            {faq ? 'Guardar cambios' : `Agregar ${texts.noun}`}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="keyed-faq-form" onSubmit={onSubmit} className="grid gap-4">
        <FaqTextFields />
        <FormInput
          name="key"
          label="Clave"
          required={!faq}
          disabled={faq !== null}
          maxLength={KEY_MAX}
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          registerOptions={{ onChange: () => setKeyTouched(true) }}
          hint={
            faq
              ? 'No cambia: para otra clave, dala de baja y creá una nueva'
              : `Minúsculas, números y guiones bajos. Identifica la ${texts.noun} y no cambia después.`
          }
        />
        <FaqFormError message={formError} />
      </Form>
    </Modal>
  );
};
