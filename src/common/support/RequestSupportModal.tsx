import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../../services/api/errors';
import { supportMode } from '../../services/api/supportMode';
import {
  SUPPORT_MINUTES,
  SUPPORT_REASON_MAX,
  SUPPORT_REASON_MIN,
  SUPPORT_TICKET_MAX,
} from '../../services/api/supportSessions';
import { useDistributors } from '../../services/queries/distributors';
import { useRequestSupportSession } from '../../services/queries/supportSessions';
import { notify } from '../../utils/notifications';
import {
  emptySupportRequest,
  SCOPE_OPTIONS,
  supportRequestSchema,
  toSupportRequest,
  type RequestSupportValues,
} from './supportRequest';
import { Button, Form, FormCheckbox, FormInput, FormSelect, FormTextArea, Modal } from '../components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  /** La empresa ya elegida (desde su ficha). */
  distributorId?: string;
  /** Precarga la referencia (el número de un ticket) y el motivo. */
  ticketRef?: string;
  reason?: string;
}

/**
 * «Pedir acceso de soporte» del administrador general (§4.12). Consentido: queda pendiente hasta que la empresa lo
 * apruebe. Emergencia: se abre al instante y la empresa recibe un aviso (si su política lo permite; si no, la API
 * responde 403 y se muestra acá).
 */
export const RequestSupportModal = ({ open, onClose, distributorId, ticketRef, reason: initialReason }: Props) => {
  const navigate = useNavigate();
  const request = useRequestSupportSession();
  const { data: distributors, isPending: loadingCompanies, error: companiesError } = useDistributors(open);
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<RequestSupportValues>({
    resolver: zodResolver(supportRequestSchema),
    defaultValues: emptySupportRequest(),
  });
  const { reset, watch } = methods;
  const reason = watch('reason') ?? '';
  const emergency = watch('emergency');

  useEffect(() => {
    if (open) {
      reset({ ...emptySupportRequest(distributorId), ticketRef: ticketRef ?? '', reason: initialReason ?? '' });
      setServerError(null);
    }
  }, [open, distributorId, ticketRef, initialReason, reset]);

  // Con la empresa elegida de antemano: el `<select>` recién tiene esa opción cuando llega la lista.
  const { setValue } = methods;
  useEffect(() => {
    if (open && distributorId && distributors) setValue('distributorId', distributorId);
  }, [open, distributorId, distributors, setValue]);

  const companies = (distributors ?? []).filter((d) => d.status === 'active' || d.distributor_id === distributorId);

  const onSubmit = async (values: RequestSupportValues) => {
    setServerError(null);
    try {
      const session = await request.mutateAsync(toSupportRequest(values));
      onClose();
      if (session.status === 'active') {
        // Emergencia o autoaprobación: se entra ya. Al aplicarla se vacía la caché y se monta el panel de la empresa.
        navigate('/home');
      } else {
        notify.success(`Pedido enviado: esperá que ${session.distributorName} lo apruebe`);
      }
      supportMode.update(session);
    } catch (error) {
      setServerError(errorMessage(error));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={request.isPending}
      size="md"
      title="Pedir acceso de soporte"
      description="Vas a ver la empresa en sólo lectura, por un tiempo limitado. La empresa ve el pedido, lo aprueba o lo rechaza y puede cortarlo cuando quiera."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={request.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="support-request"
            variant={emergency ? 'danger' : 'primary'}
            loading={request.isPending}
          >
            {emergency ? 'Abrir acceso de emergencia' : 'Pedir acceso'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="support-request" onSubmit={onSubmit} className="grid gap-4">
        {serverError && (
          <p role="alert" className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {serverError}
          </p>
        )}
        <FormSelect
          name="distributorId"
          label="Empresa"
          required
          disabled={loadingCompanies}
          hint={companiesError ? errorMessage(companiesError) : undefined}
          options={[
            { value: '', label: loadingCompanies ? 'Cargando empresas…' : 'Elegí una empresa' },
            ...companies.map((d) => ({ value: d.distributor_id, label: d.name })),
          ]}
        />
        <FormTextArea
          name="reason"
          label="Motivo"
          required
          rows={3}
          maxLength={SUPPORT_REASON_MAX}
          placeholder="Qué pasa y qué necesitás mirar. Lo lee la empresa."
          hint={`${reason.trim().length}/${SUPPORT_REASON_MAX} (mínimo ${SUPPORT_REASON_MIN})`}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            name="ticketRef"
            label="Referencia (opcional)"
            maxLength={SUPPORT_TICKET_MAX}
            placeholder="TICKET-1234"
          />
          <FormSelect
            name="minutes"
            label="Duración"
            required
            registerOptions={{ valueAsNumber: true }}
            options={SUPPORT_MINUTES.map((m) => ({ value: String(m), label: `${m} minutos` }))}
          />
        </div>
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-sm font-medium text-ink">Además de lo básico</legend>
          <p className="text-xs text-muted">
            Sin marcar nada se ve la operación con los datos personales ocultos. Pedí sólo lo que necesites.
          </p>
          {SCOPE_OPTIONS.map((option) => (
            <FormCheckbox key={option.value} name={option.value} label={option.label} hint={option.hint} />
          ))}
        </fieldset>
        <div className="grid gap-2 rounded-lg border border-warn/30 bg-warn-soft p-3">
          <FormCheckbox
            name="emergency"
            label="Acceso de emergencia"
            hint="Se abre al instante, sin esperar la aprobación. La empresa recibe un aviso inmediato; el acceso dura como máximo 60 minutos. Sólo si la empresa lo permite."
          />
        </div>
      </Form>
    </Modal>
  );
};
