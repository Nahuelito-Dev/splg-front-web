import { History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../../../hooks';
import { auditHistoryPath, type AuditEntityName } from '../../../utils/auditLabels';
import { Button } from './Button';

interface Props {
  /** Nombre de la entidad en la auditoría de datos (`Order`, `Car`…). */
  entity: AuditEntityName;
  recordId: string;
}

const HistoryButton = ({ entity, recordId }: Props) => {
  const navigate = useNavigate();
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<History />}
      onClick={() => navigate(auditHistoryPath(entity, recordId))}
    >
      Ver historial de cambios
    </Button>
  );
};

/** «Ver historial de cambios» de una ficha: abre la auditoría ya filtrada por esa entidad y ese registro. */
export const AuditHistoryLink = (props: Props) => {
  const { canViewAudit } = usePermissions();
  return canViewAudit ? <HistoryButton {...props} /> : null;
};
