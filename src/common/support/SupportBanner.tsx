import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LifeBuoy, LogOut } from 'lucide-react';
import { useSupportSession } from '../../hooks';
import { toApiError } from '../../services/api/errors';
import { supportMode } from '../../services/api/supportMode';
import type { SupportSession } from '../../services/api/types';
import { syncSupportMode, useEndSupportSession } from '../../services/queries/supportSessions';
import { notify } from '../../utils/notifications';
import { Button } from '../components/ui';
import { EXPIRY_WARNING_MS, formatRemaining } from './countdown';

/** La hora actual, cada segundo. */
const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
};

/** Salir de la sesión activa o retirar el pedido: si la API dice que ya terminó, igual se sale. */
const useLeave = () => {
  const navigate = useNavigate();
  const end = useEndSupportSession();
  const leave = (session: SupportSession, done: string) => {
    end.mutate(session.id, {
      onSuccess: () => {
        notify.success(done);
        navigate('/home');
        supportMode.update(null);
      },
      onError: (error) => {
        const { status } = toApiError(error);
        if (status === 404 || status === 409) {
          navigate('/home');
          supportMode.update(null);
          return;
        }
        notify.error(error);
      },
    });
  };
  return { leave, busy: end.isPending };
};

const ActiveBanner = ({ session }: { session: SupportSession }) => {
  const now = useNow();
  const { leave, busy } = useLeave();
  const expiresAt = session.expiresAt ? Date.parse(session.expiresAt) : null;
  const remaining = expiresAt === null ? null : expiresAt - now;
  const warned = useRef(false);
  const checkedAtZero = useRef(false);

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= EXPIRY_WARNING_MS && remaining > 0 && !warned.current) {
      warned.current = true;
      notify.warn(`La sesión de soporte en ${session.distributorName} vence en menos de 5 minutos`);
    }
    // Llegó a cero: la API decide (cierra la sesión y el panel sale con su aviso).
    if (remaining <= 0 && !checkedAtZero.current) {
      checkedAtZero.current = true;
      void syncSupportMode();
    }
  }, [remaining, session.distributorName]);

  return (
    <div
      role="region"
      aria-label="Modo soporte"
      className="border-b border-warn/30 bg-warn-soft px-3 py-2 text-[13px] text-warn sm:px-6 lg:px-7"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <LifeBuoy aria-hidden="true" className="h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 leading-snug">
          <span className="font-semibold">Modo soporte · {session.distributorName}</span>
          <span> · Sólo lectura</span>
          {remaining !== null && (
            <span className="whitespace-nowrap">
              {' '}
              · <Clock aria-hidden="true" className="inline h-3.5 w-3.5 align-[-2px]" /> Vence en{' '}
              <span className="font-semibold tabular-nums" aria-live="off">
                {formatRemaining(remaining)}
              </span>
            </span>
          )}
          <span className="hidden md:inline" title={session.reason}>
            {' '}
            · Motivo: {session.reason.length > 80 ? `${session.reason.slice(0, 80)}…` : session.reason}
          </span>
        </p>
        <Button
          size="sm"
          variant="secondary"
          icon={<LogOut />}
          loading={busy}
          onClick={() => leave(session, 'Saliste del modo soporte')}
        >
          Salir del modo soporte
        </Button>
      </div>
    </div>
  );
};

const PendingBanner = ({ session }: { session: SupportSession }) => {
  const { leave, busy } = useLeave();
  return (
    <div
      role="status"
      className="border-b border-outline bg-surface-muted px-3 py-2 text-[13px] text-ink-2 sm:px-6 lg:px-7"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Clock aria-hidden="true" className="h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 leading-snug">
          Esperando aprobación de <span className="font-semibold text-ink">{session.distributorName}</span> para entrar
          en modo soporte. Se revisa sola cada 30 segundos.
        </p>
        <Button size="sm" variant="secondary" loading={busy} onClick={() => leave(session, 'Retiraste el pedido')}>
          Retirar pedido
        </Button>
      </div>
    </div>
  );
};

/**
 * La banda del modo soporte, arriba de todo en todas las pantallas del administrador general: pendiente (neutra) o
 * activa (color de alerta de Brasa, no rojo de error) con la empresa, la cuenta regresiva y la salida.
 */
export const SupportBanner = () => {
  const { active, pending } = useSupportSession();
  if (active) return <ActiveBanner session={active} />;
  if (pending) return <PendingBanner session={pending} />;
  return null;
};
