import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PredictionAccuracyCard } from './PredictionAccuracyCard';
import { tendencyText } from './predictionAccuracyText';

afterEach(cleanup);

const base = { subtitle: 'Últimos 90 días', emptyHint: 'compras', tendencySubject: 'el cliente compra' };
const ACCURACY = {
  measured: 6,
  meanAbsoluteErrorDays: 2.5,
  withinMarginRate: 0.67,
  marginDays: 3,
  meanBiasDays: 1.5,
};

describe('PredictionAccuracyCard', () => {
  it('muestra el error medio, los aciertos, los casos y la tendencia', () => {
    render(<PredictionAccuracyCard {...base} accuracy={ACCURACY} />);
    expect(screen.getByText('2,5 días')).toBeInTheDocument();
    expect(screen.getByText('67 %')).toBeInTheDocument();
    expect(screen.getByText('Aciertos (a 3 días o menos)')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/Tiende a atrasarse: el cliente compra en promedio 1,5 días después/)).toBeInTheDocument();
  });

  it('con la corrección aplicada muestra el acierto «después» y cuánto mejoró', () => {
    render(
      <PredictionAccuracyCard
        {...base}
        accuracy={ACCURACY}
        calibrated={{ ...ACCURACY, meanAbsoluteErrorDays: 1, withinMarginRate: 0.9 }}
      />,
    );
    expect(screen.getByText('Con la corrección por el desvío de cada vehículo')).toBeInTheDocument();
    expect(screen.getByText('1 día')).toBeInTheDocument();
    expect(screen.getByText('90 %')).toBeInTheDocument();
    expect(screen.getByText('Mejora 1,5 días')).toBeInTheDocument();
  });

  it('sin acierto corregido la tarjeta es la de siempre', () => {
    render(<PredictionAccuracyCard {...base} accuracy={ACCURACY} />);
    expect(screen.queryByText(/Con la corrección/)).not.toBeInTheDocument();
  });

  it('sin casos medidos dice que todavía no hay nada para comparar', () => {
    render(
      <PredictionAccuracyCard
        {...base}
        accuracy={{ ...ACCURACY, measured: 0, meanAbsoluteErrorDays: null, withinMarginRate: null, meanBiasDays: null }}
      />,
    );
    expect(screen.getByText('Todavía no hay compras para comparar')).toBeInTheDocument();
    expect(screen.queryByText('Casos comparados')).not.toBeInTheDocument();
  });

  it('mientras carga no muestra el vacío', () => {
    render(<PredictionAccuracyCard {...base} accuracy={undefined} loading />);
    expect(screen.queryByText(/Todavía no hay/)).not.toBeInTheDocument();
  });
});

describe('tendencyText', () => {
  it('distingue adelantarse, atrasarse y sin tendencia', () => {
    expect(tendencyText(-2, 'el cliente compra')).toBe(
      'Tiende a adelantarse: el cliente compra en promedio 2 días antes de lo estimado.',
    );
    expect(tendencyText(0.2, 'x')).toMatch(/Sin una tendencia marcada/);
    expect(tendencyText(3, 'x')).toMatch(/atrasarse/);
  });
});
