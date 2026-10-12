import { useEffect, useState } from 'react';
import { Button, Modal, TextArea } from '../../../common/components/ui';
import { cx } from '../../../common/components/ui/cx';
import type { ResolveUnpaidBody } from '../../../services/api/types';
import { useResolveUnpaid } from '../../../services/queries/orders';
import { formatCurrency, formatShortId } from '../../../utils/format';
import { notify } from '../../../utils/notifications';

type Resolution = ResolveUnpaidBody['resolution'];

const OPTIONS: { value: Resolution; title: string; hint: string }[] = [
  {
    value: 'paid',
    title: 'Lo cobramos después',
    hint: 'El cliente pagó. El pedido pasa a «Cobrado» y suma a las ventas.',
  },
  {
    value: 'written_off',
    title: 'Dar por perdido',
    hint: 'No se va a cobrar. El pedido pasa a «Pérdida» y no suma a las ventas.',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** El pedido impago que se resuelve; `null` mantiene el modal cerrado. */
  order: { order_id: string; total_amount: number } | null;
}

/**
 * Resuelve un cobro en efectivo informado como impago: lo cobramos después o se da por perdido, con nota
 * obligatoria. La `Idempotency-Key` se renueva cada vez que cambia lo que se va a mandar: un reintento del mismo
 * envío (corte de red) no repite el efecto, y un cambio de resolución no choca con la clave anterior.
 */
export const ResolveUnpaidModal = ({ open, onClose, order }: Props) => {
  const resolve = useResolveUnpaid();
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (open) {
      setResolution(null);
      setNote('');
      setTouched(false);
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [open]);

  const trimmed = note.trim();
  const resolutionError = touched && !resolution ? 'Elegí cómo se resolvió' : undefined;
  const noteError = touched && !trimmed ? 'Escribí la nota: queda registrada con el cobro' : undefined;

  const submit = () => {
    setTouched(true);
    if (!order || !resolution || !trimmed) return;
    resolve.mutate(
      { id: order.order_id, body: { resolution, note: trimmed }, idempotencyKey },
      {
        onSuccess: (result) => {
          if (result.alreadyResolved) notify.info('Otro administrador ya lo había resuelto: no se cambió nada');
          else notify.success(resolution === 'paid' ? 'Cobro registrado' : 'Impago dado por perdido');
          onClose();
        },
        onError: notify.error,
      },
    );
  };

  const written = resolution === 'written_off';

  return (
    <Modal
      open={open && order !== null}
      onClose={onClose}
      title="Resolver impago"
      description={
        order
          ? `Pedido ${formatShortId(order.order_id)} · ${formatCurrency(order.total_amount)}. El chofer informó que no pudo cobrarlo en efectivo.`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button variant={written ? 'danger' : 'primary'} onClick={submit} loading={resolve.isPending}>
            {written ? 'Confirmar pérdida' : 'Confirmar cobro'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">Resolución</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cx(
                  'flex cursor-pointer gap-2.5 rounded-xl border p-3 transition-colors',
                  resolution === option.value
                    ? 'border-primary bg-primary-soft'
                    : 'border-outline bg-surface hover:bg-surface-hover',
                )}
              >
                <input
                  type="radio"
                  name="unpaid-resolution"
                  className="mt-1 accent-primary"
                  checked={resolution === option.value}
                  onChange={() => {
                    setResolution(option.value);
                    setIdempotencyKey(crypto.randomUUID());
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{option.title}</span>
                  <span className="block text-xs text-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {resolutionError && (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {resolutionError}
            </p>
          )}
        </fieldset>
        <TextArea
          label="Nota"
          required
          rows={3}
          placeholder="Ej: el cliente transfirió al día siguiente / no atiende desde hace un mes"
          value={note}
          error={noteError}
          onChange={(e) => {
            setNote(e.target.value);
            setIdempotencyKey(crypto.randomUUID());
          }}
        />
      </div>
    </Modal>
  );
};
