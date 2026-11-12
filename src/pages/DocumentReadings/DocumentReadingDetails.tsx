import { useState } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Badge,
  Card,
  CardHeader,
  DetailList,
  DetailSkeleton,
  ErrorState,
  PageContainer,
  PageHeader,
  ReasonModal,
} from '../../common/components/ui';
import { useBackToList, usePermissions } from '../../hooks';
import { errorMessage } from '../../services/api/errors';
import type { DocumentReading } from '../../services/api/types';
import { useDocumentReading, useRejectDocumentReading } from '../../services/queries/documentReadings';
import { formatDateTime, formatUsd } from '../../utils/format';
import { notify } from '../../utils/notifications';
import { DOCUMENT_READING_STATUS, labelOf } from '../../utils/statusLabels';
import { DistributorRequired } from '../Configuration/components/DistributorRequired';
import { AttachmentPreview } from './components/AttachmentPreview';
import { DecisionModal, type DecisionMode } from './components/DecisionModal';
import { ProposalCard } from './components/ProposalCard';
import { ReadingFieldsCard } from './components/ReadingFieldsCard';
import { DOCUMENT_TYPE_LABEL, documentTypeLabel } from './documentReadingRules';

const DECIDED_TEXT: Partial<Record<DocumentReading['status'], string>> = {
  confirmed: 'Confirmada',
  corrected: 'Corregida y confirmada',
  rejected: 'Rechazada',
};

/** Avisos del lector y, si ya se decidió, quién, cuándo y qué pasó. */
const ReadingInfoCard = ({ reading }: { reading: DocumentReading }) => (
  <Card className="p-5">
    <CardHeader title="Lectura" icon={<Info aria-hidden="true" className="h-4 w-4" />} />
    {reading.warnings.length > 0 && (
      <ul className="mb-4 grid gap-1.5" aria-label="Avisos del lector">
        {reading.warnings.map((warning) => (
          <li key={warning} className="flex items-start gap-2 text-sm text-ink">
            <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            {warning}
          </li>
        ))}
      </ul>
    )}
    <DetailList
      items={[
        { label: 'Tipo esperado', value: reading.expectedType ? DOCUMENT_TYPE_LABEL[reading.expectedType] : '—' },
        { label: 'Tipo detectado', value: reading.detectedType ? DOCUMENT_TYPE_LABEL[reading.detectedType] : '—' },
        { label: 'Leída', value: formatDateTime(reading.readAt) },
        { label: 'Intentos', value: String(reading.attempts) },
        { label: 'Costo', value: formatUsd(reading.costUsd), mono: true },
        ...(reading.lastError ? [{ label: 'Último error', value: reading.lastError, wide: true }] : []),
        ...(reading.duplicateOfId
          ? [
              {
                label: 'Ya se cargó en',
                value: (
                  <Link
                    to={`/document-readings/${reading.duplicateOfId}`}
                    className="font-medium text-primary underline"
                  >
                    la lectura original
                  </Link>
                ),
              },
            ]
          : []),
        ...(reading.decidedAt
          ? [
              { label: 'Decisión', value: DECIDED_TEXT[reading.status] ?? '—' },
              { label: 'Decidida', value: formatDateTime(reading.decidedAt) },
              { label: 'Aplicada', value: reading.executed ? 'Sí' : 'No (sólo se cerró la propuesta)' },
              ...(reading.decisionNote ? [{ label: 'Nota', value: reading.decisionNote, wide: true }] : []),
            ]
          : []),
      ]}
    />
  </Card>
);

/** La ficha de una lectura: el archivo, lo leído contra lo esperado y la decisión sobre la propuesta. */
export const DocumentReadingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/document-readings');
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data: reading, isPending, error, refetch } = useDocumentReading(id, { enabled: !needsDistributor });
  useCrumbLeaf(reading?.attachment?.originalName ?? (reading ? documentTypeLabel(reading) : undefined), goBack);
  const reject = useRejectDocumentReading();
  const [mode, setMode] = useState<DecisionMode | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const confirmReject = (reason: string) => {
    if (!reading) return;
    setRejectError(null);
    reject.mutate(
      { id: reading.readingId, body: { reason } },
      {
        onSuccess: () => {
          notify.success('Propuesta rechazada');
          setRejecting(false);
        },
        onError: (e) => setRejectError(errorMessage(e)),
      },
    );
  };

  return (
    <PageContainer size="xl">
      <PageHeader
        title={reading ? documentTypeLabel(reading) : 'Lectura de documento'}
        eyebrow={reading ? `Subido el ${formatDateTime(reading.createdAt)}` : undefined}
        badges={reading && <Badge label={labelOf(DOCUMENT_READING_STATUS, reading.status)} />}
      />
      {needsDistributor ? (
        <DistributorRequired />
      ) : isPending ? (
        <DetailSkeleton />
      ) : error || !reading ? (
        <ErrorState error={error} resource="La lectura" onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="grid content-start gap-6">
              <ProposalCard
                reading={reading}
                canWrite={canWrite}
                writeHint={writeHint}
                onDecide={setMode}
                onReject={() => {
                  setRejectError(null);
                  setRejecting(true);
                }}
              />
              <ReadingFieldsCard reading={reading} />
              <ReadingInfoCard reading={reading} />
            </div>
            <div className="lg:sticky lg:top-4 lg:self-start">
              <AttachmentPreview attachment={reading.attachment} />
            </div>
          </div>
          <DecisionModal reading={reading} mode={mode} onClose={() => setMode(null)} />
          <ReasonModal
            open={rejecting}
            onClose={() => setRejecting(false)}
            onConfirm={confirmReject}
            title="Rechazar la propuesta"
            description="La propuesta se cierra sin aplicar nada. El motivo queda registrado."
            confirmLabel="Rechazar"
            validateReason={(r) => (r.trim().length > 500 ? 'Hasta 500 caracteres' : undefined)}
            serverError={rejectError}
            onReasonChange={() => setRejectError(null)}
            loading={reject.isPending}
          />
        </>
      )}
    </PageContainer>
  );
};
