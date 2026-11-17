import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, CardHeader, Form, FormTextArea } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { AssistantPreview } from '../../../services/api/types';
import { FaqFormError } from '../components/FormError';
import { PreviewAnswer } from './PreviewAnswer';
import { PREVIEW_MAX, previewSchema, type PreviewValues } from './labRules';

interface PreviewMutation {
  mutate: (body: { question: string; customerId?: string }) => void;
  isPending: boolean;
  data: AssistantPreview | undefined;
  error: unknown;
}

interface Props {
  scope: 'company' | 'platform';
  preview: PreviewMutation;
  /** Qué se prueba y para quién. */
  description: string;
  placeholder: string;
  /** El cliente con el que se prueba (sólo en la empresa). */
  customer?: { id: string | null; picker: ReactNode };
  /** Por qué no se puede probar ahora (modo soporte, permisos). */
  blockedReason?: string;
}

/** «¿Qué contestaría?»: la pregunta como la escribiría alguien en el chat, y lo que el asistente haría con ella. */
export const PreviewPanel = ({ scope, preview, description, placeholder, customer, blockedReason }: Props) => {
  const methods = useForm<PreviewValues>({ resolver: zodResolver(previewSchema), defaultValues: { question: '' } });
  const result = preview.data;
  const formId = `assistant-preview-${scope}`;
  const onSubmit = ({ question }: PreviewValues) =>
    preview.mutate({ question: question.trim(), ...(customer?.id ? { customerId: customer.id } : {}) });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4 p-4 sm:p-5">
        <CardHeader title="¿Qué contestaría?" subtitle={description} as="h2" className="" />
        {/* El selector de cliente busca con su propio campo: va fuera del formulario para que Enter no pruebe. */}
        <Form methods={methods} id={formId} onSubmit={onSubmit}>
          <FormTextArea
            name="question"
            label="Pregunta"
            required
            rows={4}
            maxLength={PREVIEW_MAX}
            placeholder={placeholder}
          />
        </Form>
        {customer?.picker}
        <div className="flex justify-end">
          <Button
            type="submit"
            form={formId}
            icon={<Send aria-hidden="true" />}
            loading={preview.isPending}
            blockedReason={blockedReason}
          >
            Probar
          </Button>
        </div>
        <FaqFormError message={preview.error ? errorMessage(preview.error) : null} />
      </Card>
      <Card className="space-y-4 p-4 sm:p-5" aria-live="polite" aria-busy={preview.isPending || undefined}>
        <CardHeader title="Lo que vería" as="h2" className="" />
        {result ? (
          <>
            {!result.assistantEnabled && (
              <p
                role="note"
                className="flex items-start gap-2 rounded-xl border border-info/30 bg-info-soft p-3 text-[13px] text-ink"
              >
                <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                Hoy el asistente está apagado: en una conversación real no contestaría. Esto es lo que diría al
                prenderlo.
              </p>
            )}
            <PreviewAnswer result={result} scope={scope} />
          </>
        ) : (
          <p className="text-sm text-muted">
            Escribí una pregunta y tocá «Probar». No se crea ninguna conversación ni se le avisa a nadie.
          </p>
        )}
      </Card>
    </div>
  );
};
