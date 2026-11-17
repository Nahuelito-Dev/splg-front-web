import { RotateCw } from 'lucide-react';
import { Button, cx, Skeleton, Switch } from '../../../common/components/ui';
import { agentPresence } from '../../../features/chat/assignment/presence';
import { useChatTeamEvents } from '../../../features/chat/useChatTeamEvents';
import type { ChatStatus } from '../../../services/api/types';
import { useMyChatStatus, useUpdateMyChatStatus } from '../../../services/queries/chatAssignment';
import { useChatSettings } from '../../../services/queries/inbox';
import { notify } from '../../../utils/notifications';

export const MY_STATUS_LABEL = 'En línea para recibir conversaciones';
const HELP_ID = 'my-chat-status-help';

const load = (s: ChatStatus) => `${s.openAssigned} de ${s.maxOpen} abiertas`;

/** La línea de abajo: por qué no le llegan (si no le llegan) y cuántas tiene sobre su tope. */
const detailOf = (s: ChatStatus, openNow: boolean | undefined, autoAssign: boolean | undefined): string => {
  const parts: string[] = [];
  if (s.status === 'away') {
    parts.push('No te llegan conversaciones solas', `${s.openAssigned} abiertas`);
  } else {
    // Sin los ajustes todavía no se sabe el motivo: no se inventa.
    const presence = openNow === undefined ? (s.available ? 'online' : null) : agentPresence(s, openNow);
    if (presence === 'out_of_hours') parts.push('En línea, pero fuera del horario de atención');
    else if (presence === 'disconnected') parts.push('En línea, pero sin conexión en tiempo real');
    parts.push(load(s));
    if (presence === 'online' && s.openAssigned >= s.maxOpen) parts.push('llegaste a tu tope');
  }
  if (autoAssign === false) parts.push('la asignación automática está apagada');
  return parts.join(' · ');
};

/**
 * «En línea / Ausente» de quien atiende (8b), en la cabecera de la bandeja: el estado real (`available`), el motivo si
 * no le llegan conversaciones y cuántas tiene sobre su tope. Se pone al día con `chat:team`.
 */
export const MyChatStatus = ({ myUserId }: { myUserId: string | undefined }) => {
  const query = useMyChatStatus(true);
  const settings = useChatSettings();
  const update = useUpdateMyChatStatus();
  useChatTeamEvents(myUserId);
  const data = query.data;

  if (query.isPending) {
    return (
      <div role="status" aria-label="Cargando tu estado" className="flex items-center gap-2">
        <Skeleton className="h-6 w-11 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
    );
  }
  if (!data) {
    return (
      <p role="alert" className="flex items-center gap-2 text-xs text-danger">
        No se pudo leer tu estado.
        <Button
          size="sm"
          variant="ghost"
          icon={<RotateCw />}
          aria-label="Volver a leer tu estado"
          onClick={() => void query.refetch()}
        >
          Reintentar
        </Button>
      </p>
    );
  }

  const online = data.status === 'online';
  const presence = agentPresence(data, settings.data?.openNow);
  const change = (next: boolean) =>
    update.mutate(next ? 'online' : 'away', {
      onSuccess: (status) => notify.success(status.status === 'online' ? 'Estás en línea' : 'Quedaste ausente'),
      onError: (error) => notify.error(error),
    });

  return (
    <section
      aria-label="Tu estado en la bandeja"
      className="flex min-w-0 max-w-full items-center gap-2.5 rounded-xl border border-outline bg-surface px-3 py-1.5"
    >
      <Switch
        label={MY_STATUS_LABEL}
        checked={online}
        onChange={change}
        disabled={update.isPending}
        describedBy={HELP_ID}
      />
      <span className="grid min-w-0 leading-tight">
        <span
          aria-hidden="true"
          className={cx(
            'text-sm font-medium',
            online && presence === 'online' ? 'text-success' : online ? 'text-warn' : 'text-ink-2',
          )}
        >
          {online ? 'En línea' : 'Ausente'}
        </span>
        <span id={HELP_ID} className="text-[11.5px] text-muted">
          {detailOf(data, settings.data?.openNow, settings.data?.autoAssignEnabled)}
        </span>
        {/* Se anuncia sólo el cambio de estado y llegar al tope, no cada «N de M». */}
        <span role="status" className="sr-only">
          {online ? 'En línea' : 'Ausente'}
          {online && data.openAssigned >= data.maxOpen ? ', llegaste a tu tope' : ''}
        </span>
      </span>
    </section>
  );
};
