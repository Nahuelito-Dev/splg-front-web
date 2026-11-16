import { Bot } from 'lucide-react';
import { cx } from '../../../common/components/ui';

/** El texto de la marca: el mismo en el hilo, en la vista previa de la configuración y en las apps. */
export const AUTOMATED_LABEL = 'Respuesta automática';

/**
 * La marca de lo que manda el asistente (fuera de horario, aviso de recibido, derivación): discreta, al lado de la
 * firma. Se usa igual en el hilo de la bandeja y en la vista previa de «Mensajes y horario».
 */
export const AutomatedMark = ({ className }: { className?: string }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 rounded-full bg-info-soft px-1.5 py-px text-[10.5px] font-medium text-info',
      className,
    )}
  >
    <Bot aria-hidden="true" className="h-3 w-3" />
    {AUTOMATED_LABEL}
  </span>
);
