import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormInput, Modal } from '../../../common/components/ui';
import { LabelChip } from '../../../features/chat/labels/LabelChip';
import { labelSchema, normalizeLabelName, type LabelValues } from '../../../features/chat/labels/labelSchemas';
import { CHAT_LABEL_NAME_MAX, CHAT_LABEL_NAME_TAKEN } from '../../../services/api/chatLabels';
import { toApiError } from '../../../services/api/errors';
import type { ChatLabel } from '../../../services/api/types';
import { useCreateChatLabel, useUpdateChatLabel } from '../../../services/queries/chatLabels';
import { notify } from '../../../utils/notifications';
import { LabelColorPicker } from './LabelColorPicker';

const EMPTY: LabelValues = { name: '', color: 'orange' };
const FORM_ID = 'chat-label';

interface Props {
  /** `null`: cerrado; `'new'`: alta; una etiqueta: edición. */
  editing: ChatLabel | 'new' | null;
  onClose: () => void;
}

/** Alta y edición de una etiqueta: nombre (1 a 30, único sin mayúsculas ni tildes) y color de la paleta. */
export const LabelModal = ({ editing, onClose }: Props) => {
  const create = useCreateChatLabel();
  const update = useUpdateChatLabel();
  const methods = useForm<LabelValues>({ resolver: zodResolver(labelSchema), defaultValues: EMPTY });
  const { reset, setError, watch } = methods;
  const [formError, setFormError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;
  const values = watch();

  useEffect(() => {
    if (!editing) return;
    reset(editing === 'new' ? EMPTY : { name: editing.name, color: editing.color });
    setFormError(null);
  }, [editing, reset]);

  if (!editing) return null;
  const isNew = editing === 'new';

  const onError = (cause: unknown) => {
    const error = toApiError(cause);
    const message = error.messages.join('. ');
    // El nombre repetido va junto al nombre; el tope de 50 y lo demás, al pie.
    if (error.code === CHAT_LABEL_NAME_TAKEN || (error.status === 400 && /nombre/i.test(message))) {
      setError('name', { type: 'server', message }, { shouldFocus: true });
      setFormError(null);
    } else if (error.status === 400 && /color/i.test(message)) {
      setError('color', { type: 'server', message });
      setFormError(null);
    } else {
      // `CHAT_LABEL_LIMIT_REACHED` (ya hay 50), un 403 o la red.
      setFormError(message);
    }
  };

  const onSubmit = (v: LabelValues) => {
    setFormError(null);
    const name = normalizeLabelName(v.name);
    const done = {
      onSuccess: () => {
        notify.success(isNew ? 'Etiqueta creada' : 'Etiqueta actualizada');
        onClose();
      },
      onError,
    };
    if (editing === 'new') {
      create.mutate({ name, color: v.color }, done);
      return;
    }
    // Sólo lo que cambió (la API no avisa a la bandeja si nada cambia).
    const body = {
      ...(name !== editing.name ? { name } : {}),
      ...(v.color !== editing.color ? { color: v.color } : {}),
    };
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    update.mutate({ id: editing.id, body }, done);
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={pending}
      title={isNew ? 'Nueva etiqueta' : 'Editar etiqueta'}
      description="Sirve para clasificar las conversaciones de la bandeja. Sólo la ve el equipo: el cliente y el chofer nunca."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={pending}>
            Guardar
          </Button>
        </>
      }
    >
      <Form methods={methods} id={FORM_ID} onSubmit={onSubmit} className="grid gap-4">
        <FormInput
          name="name"
          label="Nombre"
          required
          placeholder="Ej: Reclamo de envío"
          hint={`Hasta ${CHAT_LABEL_NAME_MAX} caracteres. No se puede repetir.`}
          autoFocus
        />
        <LabelColorPicker />
        <div className="grid gap-1.5">
          <p className="text-xs font-medium text-muted">Así se ve en la bandeja</p>
          <LabelChip name={normalizeLabelName(values.name ?? '') || 'Etiqueta'} color={values.color} />
        </div>
        {formError && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
      </Form>
    </Modal>
  );
};
