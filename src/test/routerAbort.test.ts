import { describe, expect, it } from 'vitest';
import { createMemoryRouter } from 'react-router-dom';

describe('router de datos en los tests', () => {
  it('navegar a /slow, luego a /fast y terminar /slow: queda en /fast y la señal de /slow se abortó', async () => {
    let finishSlow: () => void = () => undefined;
    let slowSignal: AbortSignal | undefined;
    const router = createMemoryRouter([
      { path: '/', element: null },
      {
        path: '/slow',
        loader: ({ request }) => {
          slowSignal = request.signal;
          return new Promise((resolve) => {
            finishSlow = () => resolve(null);
          });
        },
        element: null,
      },
      { path: '/fast', loader: () => null, element: null },
    ]);
    const slow = router.navigate('/slow');
    await router.navigate('/fast');
    finishSlow();
    await slow;
    expect(router.state.location.pathname).toBe('/fast');
    expect(slowSignal?.aborted).toBe(true);
  });
});
