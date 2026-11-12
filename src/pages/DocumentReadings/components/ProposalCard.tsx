import { Check, PencilLine, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardHeader, DetailList } from '../../../common/components/ui';
import type { DocumentReading } from '../../../services/api/types';
import { formatDateTime } from '../../../utils/format';
import { ACTION_TEXT, decisionState, ownerLabel, ownerLink } from '../documentReadingRules';
import type { DecisionMode } from './DecisionModal';

interface Props {
  reading: DocumentReading;
  canWrite: boolean;
  writeHint?: string;
  onDecide: (mode: DecisionMode) => void;
  onReject: () => void;
}

/** Lo que propone el sistema con este documento, y las tres decisiones (las que la propuesta admite). */
export const ProposalCard = ({ reading, canWrite, writeHint, onDecide, onReject }: Props) => {
  const proposal = reading.proposal;
  if (!proposal) return null;
  const state = decisionState(reading);
  const { title, impact } = ACTION_TEXT[proposal.action];
  const link = ownerLink(proposal.ownerType, proposal.ownerId);
  const blocked = canWrite ? undefined : writeHint;

  return (
    <Card className="p-5">
      <CardHeader
        title="Propuesta"
        subtitle={title}
        icon={<Sparkles aria-hidden="true" className="h-4 w-4" />}
        badge={
          reading.escalatedAt ? (
            <Badge label={{ text: 'Escalada', tone: 'danger' }} />
          ) : reading.remindedAt ? (
            <Badge label={{ text: 'Recordada', tone: 'warn' }} />
          ) : undefined
        }
      />
      <div className="grid gap-4">
        <p className="text-sm text-ink">{proposal.summary}</p>
        {state.open && <p className="text-sm text-muted">{impact}</p>}
        <DetailList
          items={[
            {
              label: 'Registro',
              value: link ? (
                <Link to={link} className="font-medium text-primary underline">
                  {ownerLabel(proposal.ownerType)}
                </Link>
              ) : (
                ownerLabel(proposal.ownerType)
              ),
            },
            ...(reading.proposalExpiresAt && state.open
              ? [{ label: 'Vence la propuesta', value: formatDateTime(reading.proposalExpiresAt) }]
              : []),
            ...(proposal.differences.length > 0
              ? [
                  {
                    label: 'Diferencias',
                    value: `${proposal.differences.length} ${proposal.differences.length === 1 ? 'dato no coincide' : 'datos no coinciden'}`,
                  },
                ]
              : []),
          ]}
        />
        {state.onlyReject && (
          <p role="note" className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-ink">
            {state.onlyReject}
          </p>
        )}
        {state.open && (
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<Check />}
              onClick={() => onDecide('confirm')}
              blockedReason={blocked ?? state.onlyReject ?? state.confirmBlocked}
            >
              Confirmar
            </Button>
            <Button
              variant="secondary"
              icon={<PencilLine />}
              onClick={() => onDecide('correct')}
              blockedReason={blocked ?? state.onlyReject}
            >
              Corregir
            </Button>
            <Button variant="danger" icon={<X />} onClick={onReject} blockedReason={blocked}>
              Rechazar
            </Button>
          </div>
        )}
        {state.open && state.confirmBlocked && !state.onlyReject && (
          <p className="text-xs text-muted">{state.confirmBlocked}</p>
        )}
      </div>
    </Card>
  );
};
