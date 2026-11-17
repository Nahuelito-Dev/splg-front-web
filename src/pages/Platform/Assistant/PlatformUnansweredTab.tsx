import {
  useCreatePlatformFaqFromUnanswered,
  useDismissPlatformUnanswered,
  usePlatformUnanswered,
} from '../../../services/queries/assistantLab';
import { UnansweredPanel } from '../../Assistant/lab/UnansweredPanel';

interface Props {
  /** Crear la pregunta o descartar pide `plataforma.tickets.configurar`; ver la lista, `plataforma.tickets.ver`. */
  canManage: boolean;
}

/** Las preguntas de las distribuidoras que el asistente del soporte no supo contestar. */
export const PlatformUnansweredTab = ({ canManage }: Props) => {
  const create = useCreatePlatformFaqFromUnanswered();
  const dismiss = useDismissPlatformUnanswered();
  return (
    <UnansweredPanel
      useList={usePlatformUnanswered}
      create={create}
      dismiss={dismiss}
      canManage={canManage}
      audience="las distribuidoras"
    />
  );
};
