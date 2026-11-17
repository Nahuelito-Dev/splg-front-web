import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormInput, FormSelect, Modal } from '../../../common/components/ui';
import {
  agentLimitSchema,
  isMaxOpenError,
  type AgentLimitValues,
} from '../../../features/chat/assignment/assignmentSchemas';
import { AUTO_ASSIGN_MAX_OPEN_MAX, AUTO_ASSIGN_MAX_OPEN_MIN } from '../../../services/api/chatAssignment';
import { toApiError } from '../../../services/api/errors';
import type { ChatAgent } from '../../../services/api/types';
import { useUpdateChatAgent } from '../../../services/queries/chatAssignment';
import { notify } from '../../../utils/notifications';

const FORM_ID = 'chat-agent-limit';

interface Props {
  /** La persona a la que se le cambia el tope; `null`: cerrado. */
  agent: ChatAgent | null;
  /** El tope de la empresa (`autoAssignMaxOpen`), para la opción «el de la empresa». */
  companyMaxOpen: number | undefined;
  onClose: () => void;
}

const toValues = (agent: ChatAgent): AgentLimitValues => ({
  mode: agent.maxOpenOverride === null ? 'company' : 'own',
  maxOpen: agent.maxOpenOverride ?? agent.maxOpen,
});

/** El tope de una persona: el de la empresa o uno propio de 1 a 50 (`PUT /v2/chat/agents/:userId`). */
export const AgentLimitModal = ({ agent, companyMaxOpen, onClose }: Props) => {
  const update = useUpdateChatAgent();
  const methods = useForm<AgentLimitValues>({
    resolver: zodResolver(agentLimitSchema),
    defaultValues: { mode: 'company', maxOpen: 5 },
  });
  const { reset, setError, watch } = methods;
  const [formError, setFormError] = useState<string | null>(null);
  const mode = watch('mode');

  useEffect(() => {
    if (!agent) return;
    reset(toValues(agent));
    setFormError(null);
  }, [agent, reset]);

  if (!agent) return null;

  const onSubmit = (v: AgentLimitValues) => {
    setFormError(null);
    update.mutate(
      { userId: agent.userId, maxOpenOverride: v.mode === 'own' ? v.maxOpen : null },
      {
        onSuccess: () => {
          notify.success(`Tope de ${agent.name} guardado`);
          onClose();
        },
        onError: (cause) => {
          const error = toApiError(cause);
          const message = error.messages.join('. ');
          if (error.status === 400 && error.messages.some(isMaxOpenError)) {
            setError('maxOpen', { type: 'server', message }, { shouldFocus: true });
          } else {
            // 404 (dejó de ser del equipo), 403 o la red.
            setFormError(message);
          }
        },
      },
    );
  };

  const company = companyMaxOpen === undefined ? 'El de la empresa' : `El de la empresa (${companyMaxOpen})`;

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={update.isPending}
      title={`Tope de ${agent.name}`}
      description="Cuántas conversaciones abiertas puede tener antes de que la asignación automática deje de darle más."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={update.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <Form methods={methods} id={FORM_ID} onSubmit={onSubmit} className="grid gap-4">
        <FormSelect
          name="mode"
          label="Tope"
          options={[
            { value: 'company', label: company },
            { value: 'own', label: 'Uno propio' },
          ]}
        />
        {mode === 'own' && (
          <FormInput
            name="maxOpen"
            label="Conversaciones abiertas"
            type="number"
            inputMode="numeric"
            min={AUTO_ASSIGN_MAX_OPEN_MIN}
            max={AUTO_ASSIGN_MAX_OPEN_MAX}
            registerOptions={{ valueAsNumber: true }}
            hint={`De ${AUTO_ASSIGN_MAX_OPEN_MIN} a ${AUTO_ASSIGN_MAX_OPEN_MAX}.`}
            autoFocus
          />
        )}
        {formError && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
      </Form>
    </Modal>
  );
};
