import { ArrowLeft, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState, PageContainer, PageHeader } from '../../common/components/ui';
import { MESSAGES_PATH } from '../../features/chat/routes';
import { useInboxAccess } from '../../features/chat/useInboxAccess';
import { AssistantCard } from './settings/AssistantCard';
import { AutoAssignCard } from './settings/AutoAssignCard';
import { BusinessHoursCard } from './settings/BusinessHoursCard';
import { ConversationTimesCard } from './settings/ConversationTimesCard';
import { CustomerActionsCard } from './settings/CustomerActionsCard';
import { LabelsCard } from './settings/LabelsCard';
import { SurveyCard } from './settings/SurveyCard';
import { TemplatesCard } from './settings/TemplatesCard';

/**
 * «Mensajes y horario» (§15.2, Configuración): horario de atención con días sin atención, el asistente, los
 * tiempos de la conversación (tiempo esperado y cierre por inactividad), las respuestas guardadas y las etiquetas. Edita quien tiene `mensajes.configurar`; quien atiende la bandeja la puede leer.
 */
export const MessagesSettings = () => {
  const navigate = useNavigate();
  const access = useInboxAccess();
  // En modo soporte `useInboxAccess` no da ningún permiso (D-C2b): ni se edita ni se lee.
  const canEdit = access.configure;

  if (!access.configure && !access.any) {
    return (
      <PageContainer>
        <PageHeader title="Mensajes y horario" />
        <Card>
          <EmptyState
            icon={Settings2}
            title="No tenés permiso para configurar los mensajes"
            description="Hace falta el permiso «Configurar los mensajes»."
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="md" stack>
      <PageHeader
        title="Mensajes y horario"
        description="Cuándo atiende la empresa, qué responde el sistema solo, a quién se le da sola cada conversación, los botones y la encuesta del cliente, cuándo se cierra sola una conversación, y las respuestas guardadas y etiquetas del equipo."
        badges={!canEdit ? <span className="text-xs text-muted">Sólo lectura</span> : undefined}
        actions={
          <Button variant="secondary" icon={<ArrowLeft />} onClick={() => navigate(MESSAGES_PATH)}>
            Ir a la bandeja
          </Button>
        }
      />
      <BusinessHoursCard canEdit={canEdit} />
      <AssistantCard canEdit={canEdit} />
      <AutoAssignCard canEdit={canEdit} />
      <ConversationTimesCard canEdit={canEdit} />
      <CustomerActionsCard canEdit={canEdit} />
      <SurveyCard canEdit={canEdit} canSeeResults={access.customers} />
      <TemplatesCard canEdit={canEdit} />
      <LabelsCard
        canEdit={canEdit}
        usage={access.customers && access.drivers ? 'exact' : access.any ? 'partial' : 'none'}
      />
    </PageContainer>
  );
};
