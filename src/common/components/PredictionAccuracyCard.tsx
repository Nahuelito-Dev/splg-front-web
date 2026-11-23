import { Target } from 'lucide-react';
import type { PredictionAccuracy } from '../../services/api/types';
import { days, improvementText, tendencyText } from './predictionAccuracyText';
import { Card, CardHeader, EmptyState, ErrorState, Skeleton } from './ui';

interface Props {
  accuracy: PredictionAccuracy | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  subtitle: string;
  /** Qué se compara, en plural y para el estado vacío («compras», «trabajos»). */
  emptyHint: string;
  /** Quién se adelanta o se atrasa: «El cliente compra», «El taller se hace». */
  tendencySubject: string;
  /**
   * El mismo acierto con la corrección por el desvío ya aplicada (autocalibración): se muestra al lado del de arriba
   * como «después», para ver si corregir ayudó. Sin esto la tarjeta es la de siempre.
   */
  calibrated?: PredictionAccuracy;
}

/** «Acierto de la predicción»: cuánto se parece lo que pasó a la fecha que estimó el sistema. */
export const PredictionAccuracyCard = ({
  accuracy,
  loading = false,
  error,
  onRetry,
  subtitle,
  emptyHint,
  tendencySubject,
  calibrated,
}: Props) => {
  const measured = accuracy?.measured ?? 0;
  return (
    <Card className="p-4" aria-label="Acierto de la predicción">
      <CardHeader title="Acierto de la predicción" subtitle={subtitle} icon={<Target />} />
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : error && !accuracy ? (
        <ErrorState error={error} resource="El acierto de la predicción" onRetry={onRetry} />
      ) : !accuracy || measured === 0 ? (
        <EmptyState compact title={`Todavía no hay ${emptyHint} para comparar`} />
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[13px] text-muted">Se equivoca en promedio</dt>
              <dd className="text-xl font-semibold text-ink">
                {accuracy.meanAbsoluteErrorDays === null ? '–' : days(accuracy.meanAbsoluteErrorDays)}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">{`Aciertos (a ${accuracy.marginDays} días o menos)`}</dt>
              <dd className="text-xl font-semibold text-ink">
                {accuracy.withinMarginRate === null ? '–' : `${Math.round(accuracy.withinMarginRate * 100)} %`}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Casos comparados</dt>
              <dd className="text-xl font-semibold text-ink">{measured}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[13px] text-ink-2">{tendencyText(accuracy.meanBiasDays, tendencySubject)}</p>
          {calibrated && calibrated.measured > 0 && (
            <div className="mt-3 border-t border-outline-soft pt-3" aria-label="Acierto con la corrección por desvío">
              <p className="text-[13px] font-medium text-ink">Con la corrección por el desvío de cada vehículo</p>
              <dl className="mt-2 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-[13px] text-muted">Se equivoca en promedio</dt>
                  <dd className="text-lg font-semibold text-ink">
                    {calibrated.meanAbsoluteErrorDays === null ? '–' : days(calibrated.meanAbsoluteErrorDays)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">{`Aciertos (a ${calibrated.marginDays} días o menos)`}</dt>
                  <dd className="text-lg font-semibold text-ink">
                    {calibrated.withinMarginRate === null ? '–' : `${Math.round(calibrated.withinMarginRate * 100)} %`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[13px] text-muted">Antes → después</dt>
                  <dd className="text-lg font-semibold text-ink">{improvementText(accuracy, calibrated)}</dd>
                </div>
              </dl>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
