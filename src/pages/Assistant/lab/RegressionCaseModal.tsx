import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button, Form, FormSelect, FormTextArea, Modal } from '../../../common/components/ui';
import { toApiError } from '../../../services/api/errors';
import type { RegressionCase } from '../../../services/api/types';
import { useCreateRegressionCase, useUpdateRegressionCase } from '../../../services/queries/assistantLab';
import { notify } from '../../../utils/notifications';
import { REGRESSION_EXPECTED } from '../../../utils/statusLabels';
import { FaqFormError } from '../components/FormError';
import {
  CASE_QUESTION_MAX,
  MENTIONS_MAX,
  regressionCaseSchema,
  regressionCaseValues,
  toRegressionCaseBody,
  type RegressionCaseValues,
} from './labRules';

interface Props {
  open: boolean;
  onClose: () => void;
  /** El que se edita; `null` para uno nuevo. */
  item: RegressionCase | null;
}

const FORM_ID = 'regression-case-form';
const EXPECTED_OPTIONS = (['answer', 'handoff'] as const).map((value) => ({
  value,
  label: REGRESSION_EXPECTED[value].text,
}));

/** Alta o edición de un caso del lote: la pregunta, qué se espera y qué tiene que mencionar la respuesta. */
export const RegressionCaseModal = ({ open, onClose, item }: Props) => {
  const create = useCreateRegressionCase();
  const update = useUpdateRegressionCase();
  const methods = useForm<RegressionCaseValues>({ resolver: zodResolver(regressionCaseSchema) });
  const { reset, control, setError } = methods;
  const expected = useWatch({ control, name: 'expected' });
  const [formError, setFormError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    reset(regressionCaseValues(item));
    setFormError(null);
  }, [open, item, reset]);

  const onError = (error: unknown) => {
    const apiError = toApiError(error);
    if (apiError.code === 'ASSISTANT_REGRESSION_CASE_DUPLICATE') {
      setError('question', { type: 'server', message: apiError.messages.join('. ') }, { shouldFocus: true });
      return;
    }
    setFormError(apiError.messages.join('. '));
  };

  const onSubmit = (values: RegressionCaseValues) => {
    setFormError(null);
    const body = toRegressionCaseBody(values);
    const callbacks = {
      onSuccess: () => {
        notify.success(item ? 'Caso actualizado' : 'Caso agregado');
        onClose();
      },
      onError,
    };
    if (item) update.mutate({ id: item.id, body }, callbacks);
    else create.mutate(body, callbacks);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={pending}
      size="md"
      title={item ? 'Editar caso' : 'Nuevo caso'}
      description="Una pregunta típica de un cliente y lo que tiene que hacer el asistente con ella."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending}>
            {item ? 'Guardar cambios' : 'Agregar caso'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id={FORM_ID} onSubmit={onSubmit} className="grid gap-4">
        <FormTextArea
          name="question"
          label="Pregunta"
          required
          rows={3}
          maxLength={CASE_QUESTION_MAX}
          placeholder="¿Hasta qué hora toman pedidos?"
        />
        <FormSelect name="expected" label="Qué se espera" required options={EXPECTED_OPTIONS} />
        {expected === 'answer' && (
          <FormTextArea
            name="mentions"
            label="Tiene que mencionar"
            rows={3}
            placeholder={'20 hs\nsábado'}
            hint={`Una palabra o frase por renglón, hasta ${MENTIONS_MAX}. No importan mayúsculas ni tildes.`}
          />
        )}
        <FaqFormError message={formError} />
      </Form>
    </Modal>
  );
};
