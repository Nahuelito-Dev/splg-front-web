import { broadcastSchema, type BroadcastValues } from './inboxSchemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, FormTextArea, Modal, SearchInput, Skeleton } from '../../../common/components/ui';
import { BROADCAST_MAX } from '../../../services/api/inbox';
import { MESSAGE_MAX } from '../../../services/api/supportChat';
import { useDeliveryOptions } from '../../../services/queries/deliveries';
import { useBroadcastDrivers } from '../../../services/queries/inbox';
import { notify } from '../../../utils/notifications';
import { useIntentId } from './useIntentId';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * «Avisar a varios choferes» (§4.4): el mismo mensaje en la conversación general de cada uno (no es un grupo: nadie ve
 * las respuestas de los otros). El lote lleva su id: reintentar no duplica. Si alguno no es de la empresa, la API no
 * manda a ninguno.
 */
export const BroadcastDriversModal = ({ open, onClose }: Props) => {
  const drivers = useDeliveryOptions();
  const broadcast = useBroadcastDrivers();
  const [term, setTerm] = useState('');
  const intent = useIntentId();
  const methods = useForm<BroadcastValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { driverIds: [], body: '' },
  });
  const { reset, watch, setValue, formState } = methods;
  const selected = watch('driverIds');

  useEffect(() => {
    if (open) {
      reset({ driverIds: [], body: '' });
      setTerm('');
      intent.reset();
    }
  }, [open, reset, intent]);

  const list = useMemo(
    () =>
      (drivers.data?.rows ?? []).filter(
        (driver) => driver.user && !driver.deletedAt && driver.isEnabled && !driver.user.blocked,
      ),
    [drivers.data],
  );
  const visible = list.filter((driver) =>
    (driver.user?.full_name ?? '').toLowerCase().includes(term.trim().toLowerCase()),
  );

  const toggle = (userId: string) => {
    const next = selected.includes(userId) ? selected.filter((id) => id !== userId) : [...selected, userId];
    setValue('driverIds', next, { shouldValidate: formState.isSubmitted });
  };
  const allVisible = visible.length > 0 && visible.every((driver) => selected.includes(driver.user_id));
  const toggleAll = () => {
    const ids = visible.map((driver) => driver.user_id);
    const next = allVisible
      ? selected.filter((id) => !ids.includes(id))
      : [...new Set([...selected, ...ids])].slice(0, BROADCAST_MAX);
    setValue('driverIds', next, { shouldValidate: formState.isSubmitted });
  };

  const onSubmit = (values: BroadcastValues) => {
    if (broadcast.isPending) return;
    broadcast.mutate(
      {
        driverIds: values.driverIds,
        body: values.body.trim(),
        clientBatchId: intent.idFor(JSON.stringify([[...values.driverIds].sort(), values.body.trim()])),
      },
      {
        onSuccess: ({ conversationIds }) => {
          const count = conversationIds.length;
          notify.success(`Aviso enviado a ${count} ${count === 1 ? 'chofer' : 'choferes'}`);
          onClose();
        },
        onError: (error) => notify.error(error),
      },
    );
  };

  const error = formState.errors.driverIds?.message;

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={broadcast.isPending}
      title="Avisar a varios choferes"
      description="Le llega a cada uno en su conversación con la base. Cada respuesta vuelve sólo a la bandeja."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={broadcast.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="broadcast-drivers" loading={broadcast.isPending}>
            Enviar a {selected.length} {selected.length === 1 ? 'chofer' : 'choferes'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="broadcast-drivers" onSubmit={onSubmit} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">
            Choferes{' '}
            <span className="text-muted">
              ({selected.length} de {BROADCAST_MAX} como máximo)
            </span>
          </legend>
          <SearchInput
            label="Buscar chofer"
            placeholder="Buscar por nombre"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <div className="max-h-56 overflow-y-auto rounded-xl border border-outline p-1.5">
            {drivers.isPending ? (
              <div className="grid gap-2 p-1" role="status" aria-label="Cargando choferes">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : drivers.error ? (
              <p role="alert" className="p-2 text-xs text-danger">
                No se pudieron cargar los choferes.{' '}
                <button type="button" className="underline" onClick={() => void drivers.refetch()}>
                  Reintentar
                </button>
              </p>
            ) : visible.length === 0 ? (
              <p className="p-2 text-xs text-muted">No hay choferes habilitados que coincidan.</p>
            ) : (
              <>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-hover">
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={allVisible} onChange={toggleAll} />
                  Elegir todos los que se ven
                </label>
                {visible.map((driver) => (
                  <label
                    key={driver.user_id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface-hover"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={selected.includes(driver.user_id)}
                      onChange={() => toggle(driver.user_id)}
                    />
                    <span className="min-w-0 flex-1 truncate">{driver.user?.full_name ?? 'Sin nombre'}</span>
                  </label>
                ))}
              </>
            )}
          </div>
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
        </fieldset>
        <FormTextArea
          name="body"
          label="Aviso"
          required
          rows={4}
          maxLength={MESSAGE_MAX}
          placeholder="Ej: Hoy cerramos a las 18. Pasen a rendir antes."
        />
      </Form>
    </Modal>
  );
};
