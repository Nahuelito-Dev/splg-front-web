import { useId } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormInput, FormTextArea } from '../../../common/components/ui';
import { ANSWER_MAX, QUESTION_MAX, textLength } from '../faqRules';
import { CharCounter } from './CharCounter';

interface Props {
  disabled?: boolean;
  /** La respuesta se puede dejar vacía (la pregunta queda como borrador). */
  answerOptional?: boolean;
}

interface FaqText {
  question: string;
  answer: string;
}

const lengthOf = (value: unknown) => textLength(typeof value === 'string' ? value : '');

/** Pregunta y respuesta, con su contador. Las comparten la base de la distribuidora y la de OrixTech. */
export const FaqTextFields = ({ disabled, answerOptional = false }: Props) => {
  const prefix = useId();
  const { control, getFieldState, formState } = useFormContext<FaqText>();
  const [question, answer] = useWatch({ control, name: ['question', 'answer'] });
  // El campo describe su error (si lo hay) y su contador: los ids son fijos para poder nombrarlos.
  const ids = (name: keyof FaqText) => {
    const field = `${prefix}-${name}`;
    const error = getFieldState(name, formState).error ? `${field}-error` : null;
    return { field, counter: `${field}-counter`, describedBy: [error, `${field}-counter`].filter(Boolean).join(' ') };
  };
  const q = ids('question');
  const a = ids('answer');
  return (
    <>
      <FormInput
        name="question"
        id={q.field}
        label="Pregunta"
        required
        disabled={disabled}
        placeholder="¿Hasta qué hora toman pedidos?"
        aria-describedby={q.describedBy}
      />
      <CharCounter id={q.counter} length={lengthOf(question)} max={QUESTION_MAX} />
      <FormTextArea
        name="answer"
        id={a.field}
        label="Respuesta"
        required={!answerOptional}
        hint={answerOptional ? 'Si la dejás vacía, queda como borrador y la completás después' : undefined}
        rows={6}
        disabled={disabled}
        placeholder="De lunes a sábado, de 8 a 20. Los pedidos fuera de horario se entregan al día siguiente."
        aria-describedby={a.describedBy}
      />
      <CharCounter id={a.counter} length={lengthOf(answer)} max={ANSWER_MAX} />
      <p className="text-xs text-muted">Texto plano: sin etiquetas HTML ni códigos como &amp;amp;.</p>
    </>
  );
};
