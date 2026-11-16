import '@testing-library/jest-dom/vitest';
import { cleanup, render as rtlRender, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeModeProvider } from '../../../theme/ThemeModeContext';
import { DailyChart } from './DailyChart';

/** Con el proveedor del tema de verdad: los colores del gráfico salen de la paleta activa. */
const render = (ui: ReactElement) => rtlRender(<ThemeModeProvider>{ui}</ThemeModeProvider>);

afterEach(cleanup);

describe('gráfico diario de las métricas', () => {
  it('los lectores de pantalla leen una tabla con el día, las conversaciones y la mediana (sin dato, guion)', () => {
    render(
      <DailyChart
        daily={[
          { date: '2026-11-15', newConversations: 3, firstResponseMedianMinutes: 95 },
          { date: '2026-11-16', newConversations: 0, firstResponseMedianMinutes: null },
        ]}
      />,
    );
    const table = screen.getByRole('table', {
      name: 'Conversaciones nuevas y mediana de la primera respuesta por día',
    });
    expect(table).toHaveClass('sr-only');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Día', 'Conversaciones nuevas', 'Primera respuesta (mediana, min hábiles)']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(['15 nov 202631 h 35 min', '16 nov 20260—']);
  });

  it('la leyenda dice la unidad de la línea', () => {
    render(<DailyChart daily={[]} />);
    expect(screen.getByText('Primera respuesta (mediana, min hábiles)', { selector: 'p span' })).toBeInTheDocument();
  });
});
