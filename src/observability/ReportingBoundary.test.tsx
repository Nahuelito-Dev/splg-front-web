import * as Sentry from '@sentry/react';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { ReportingBoundary } from './ReportingBoundary';

const Boom = (): never => {
  throw new Error('se rompió el render');
};

describe('ReportingBoundary', () => {
  const sent: Sentry.ErrorEvent[] = [];
  Sentry.init({
    dsn: 'https://clave@o1.ingest.us.sentry.io/2',
    integrations: [],
    defaultIntegrations: false,
    transport: () => ({ send: () => Promise.resolve({}), flush: () => Promise.resolve(true) }),
    beforeSend: (event) => {
      sent.push(event);
      return null;
    },
  });

  afterAll(async () => {
    await Sentry.close();
  });

  it('reporta el error de render y deja la pantalla de error de React Router', async () => {
    // React y React Router loguean el error atrapado: se silencia para no ensuciar la salida.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const router = createMemoryRouter([
      {
        path: '*',
        element: (
          <ReportingBoundary>
            <Boom />
          </ReportingBoundary>
        ),
      },
    ]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Unexpected Application Error!')).toBeInTheDocument();
    expect(screen.getByText('se rompió el render')).toBeInTheDocument();
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]?.exception?.values?.at(-1)?.value).toBe('se rompió el render');
    consoleError.mockRestore();
  });
});
