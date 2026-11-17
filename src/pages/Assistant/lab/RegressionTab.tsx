import { useState } from 'react';
import { ListPlus, ListChecks } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  RowActions,
  Skeleton,
} from '../../../common/components/ui';
import type { RegressionCase } from '../../../services/api/types';
import { useDeleteRegressionCase, useRegressionCases } from '../../../services/queries/assistantLab';
import { confirm, notify } from '../../../utils/notifications';
import { REGRESSION_EXPECTED } from '../../../utils/statusLabels';
import { RegressionCaseModal } from './RegressionCaseModal';
import { RegressionRunCard } from './RegressionRunCard';

interface Props {
  /** Puede cargar casos y correr el lote (`asistente.gestionar`). */
  mayManage: boolean;
  /** Por qué no se puede escribir ahora (modo soporte). */
  writeHint?: string;
}

const CaseList = ({
  items,
  onEdit,
  onDelete,
}: {
  items: RegressionCase[];
  onEdit?: (item: RegressionCase) => void;
  onDelete?: (item: RegressionCase) => void;
}) => (
  <ul className="divide-y divide-outline" aria-label="Casos del lote">
    {items.map((item) => (
      <li key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0 space-y-1.5">
          <p className="break-words text-sm font-semibold text-ink">{item.question}</p>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
            <Badge label={REGRESSION_EXPECTED[item.expected]} />
            {item.mustMention.length > 0 && <span>{`Tiene que mencionar: ${item.mustMention.join(', ')}`}</span>}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <RowActions
            rowLabel={`el caso «${item.question}»`}
            onEdit={onEdit ? () => onEdit(item) : undefined}
            onDelete={onDelete ? () => onDelete(item) : undefined}
            deleteLabel="Dar de baja"
          />
        )}
      </li>
    ))}
  </ul>
);

/**
 * El lote de pruebas del asistente: preguntas típicas con lo que tiene que hacer con cada una. Correrlo después de
 * cambiar la base muestra si algo dejó de contestarse bien.
 */
export const RegressionTab = ({ mayManage, writeHint }: Props) => {
  const cases = useRegressionCases();
  const remove = useDeleteRegressionCase();
  const [editing, setEditing] = useState<RegressionCase | null>(null);
  const [creating, setCreating] = useState(false);
  const canManage = mayManage && !writeHint;
  const items = cases.data?.items ?? [];
  const full =
    cases.data && items.length >= cases.data.limit ? `Llegaste al máximo de ${cases.data.limit} casos` : undefined;
  const loadHint = !cases.data ? (cases.error ? 'No se pudo cargar el lote' : 'Cargando el lote…') : undefined;

  const askDelete = async (item: RegressionCase) => {
    const ok = await confirm({
      title: '¿Dar de baja el caso?',
      text: `«${item.question}» deja de correrse en el lote.`,
      confirmText: 'Dar de baja',
      danger: true,
    });
    if (ok) remove.mutate(item.id, { onSuccess: () => notify.success('Caso dado de baja'), onError: notify.error });
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-4 sm:p-5">
          <CardHeader
            title="Casos"
            subtitle={
              cases.data
                ? `${items.length} de ${cases.data.limit}. Cada caso corre como un cliente sin pedidos.`
                : 'Cada caso corre como un cliente sin pedidos.'
            }
            as="h2"
            className=""
            action={
              mayManage && (
                <Button
                  icon={<ListPlus aria-hidden="true" />}
                  blockedReason={writeHint ?? loadHint ?? full}
                  onClick={() => setCreating(true)}
                >
                  Nuevo caso
                </Button>
              )
            }
          />
        </div>
        {cases.isPending ? (
          <div role="status" aria-label="Cargando los casos" className="space-y-3 px-4 pb-4 sm:px-5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !cases.data ? (
          <ErrorState error={cases.error} resource="El lote" onRetry={() => void cases.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Todavía no hay casos"
            description="Sumá las preguntas que más te hacen y qué esperás que haga el asistente con cada una."
          />
        ) : (
          <CaseList
            items={items}
            onEdit={canManage ? setEditing : undefined}
            onDelete={canManage ? (item) => void askDelete(item) : undefined}
          />
        )}
      </Card>
      <RegressionRunCard
        canRun={mayManage}
        runBlockedReason={writeHint ?? (cases.data && items.length === 0 ? 'Cargá al menos un caso' : undefined)}
      />
      {canManage && (
        <RegressionCaseModal
          open={creating || editing !== null}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          item={editing}
        />
      )}
    </div>
  );
};
