import type * as SentryReact from '@sentry/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const init = vi.hoisted(() => vi.fn());
const replayIntegration = vi.hoisted(() => vi.fn());
const addIntegration = vi.hoisted(() => vi.fn<[unknown], void>());
vi.mock('@sentry/react', async (importOriginal) => {
  const real = await importOriginal<typeof SentryReact>();
  replayIntegration.mockImplementation(real.replayIntegration);
  return { ...real, init, replayIntegration, addIntegration };
});

const { apiTraceTarget, buildSentryOptions, initSentry, loadReplay, readSentryEnv } = await import('./sentry');

const env = (over: Partial<Parameters<typeof buildSentryOptions>[0]> = {}) => ({
  dsn: 'https://clave@o1.ingest.us.sentry.io/2',
  mode: 'development',
  production: false,
  apiUrl: 'http://localhost:3000/api',
  version: '1.4.0',
  pageOrigin: 'http://localhost:3001',
  replay: false,
  ...over,
});

afterEach(() => {
  init.mockReset();
  addIntegration.mockReset();
  replayIntegration.mockClear();
});

describe('sin DSN no se inicializa', () => {
  it.each([undefined, '', '   '])('DSN %j: no llama a Sentry.init', (dsn) => {
    expect(initSentry(env({ dsn }))).toBe(false);
    expect(buildSentryOptions(env({ dsn }))).toBeNull();
    expect(init).not.toHaveBeenCalled();
  });

  it('lee VITE_SENTRY_DSN del entorno: vacío, no inicializa', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    expect(readSentryEnv().dsn).toBe('');
    expect(initSentry()).toBe(false);
    expect(init).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('con DSN sí', () => {
    expect(initSentry(env())).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
  });
});

describe('opciones', () => {
  it('release con la versión de package.json y entorno por defecto el mode', () => {
    const options = buildSentryOptions(env());
    expect(options?.release).toBe('splg-frontend@1.4.0');
    expect(options?.environment).toBe('development');
    expect(buildSentryOptions(env({ environment: 'staging' }))?.environment).toBe('staging');
  });

  it('desarrollo: todas las trazas y replay en todo error', () => {
    const options = buildSentryOptions(env({ replay: true }));
    expect(options?.tracesSampleRate).toBe(1);
    expect(options?.replaysSessionSampleRate).toBe(0);
    expect(options?.replaysOnErrorSampleRate).toBe(1);
  });

  it('producción: 10 % de trazas y replay en la mitad de los errores', () => {
    const options = buildSentryOptions(env({ production: true, mode: 'production', replay: true }));
    expect(options?.tracesSampleRate).toBe(0.1);
    expect(options?.replaysSessionSampleRate).toBe(0);
    expect(options?.replaysOnErrorSampleRate).toBe(0.5);
  });

  it('no junta datos personales por su cuenta', () => {
    expect(buildSentryOptions(env())?.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    });
  });

  it('el filtro de datos personales está enganchado', () => {
    const options = buildSentryOptions(env());
    const event = options?.beforeSend?.({ type: undefined, message: 'falló a@b.com' }, {}) as {
      message?: string;
    } | null;
    expect(event?.message).toBe('falló [email]');
  });
});

describe('trazas: sólo hacia la API propia', () => {
  const target = apiTraceTarget('https://orix-server.tail.ts.net/api/')!;
  it.each([
    'https://orix-server.tail.ts.net/api',
    'https://orix-server.tail.ts.net/api/v1/customers',
    'https://orix-server.tail.ts.net/api/v2/exports?x=1',
  ])('propaga a %s', (url) => {
    expect(target.test(url)).toBe(true);
  });

  it.each([
    'https://maps.googleapis.com/maps/api/js',
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup',
    'https://firestore.googleapis.com/google.firestore.v1',
    'https://api.mercadopago.com/v1/payments',
    'https://orix-server.tail.ts.net/apiotra',
    'https://evil.com/?u=https://orix-server.tail.ts.net/api',
    'https://orix-server.tail.ts.net/socket.io/?EIO=4',
  ])('no propaga a %s', (url) => {
    expect(target.test(url)).toBe(false);
  });

  it('las opciones llevan sólo ese destino', () => {
    const targets = buildSentryOptions(env())?.tracePropagationTargets;
    expect(targets).toHaveLength(1);
    expect((targets?.[0] as RegExp).test('http://localhost:3000/api/v1/orders')).toBe(true);
  });
});

describe('Session Replay: apagado por defecto', () => {
  const names = (options: ReturnType<typeof buildSentryOptions>) =>
    ((options?.integrations ?? []) as { name: string }[]).map((integration) => integration.name);

  it('sin VITE_SENTRY_REPLAY no hay integración de Replay ni tasas, y no se carga', async () => {
    vi.stubEnv('VITE_SENTRY_REPLAY', '');
    expect(readSentryEnv().replay).toBe(false);
    vi.unstubAllEnvs();
    const options = buildSentryOptions(env());
    expect(names(options)).not.toContain('Replay');
    expect(options).not.toHaveProperty('replaysOnErrorSampleRate');
    expect(initSentry(env())).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(addIntegration).not.toHaveBeenCalled();
    expect(replayIntegration).not.toHaveBeenCalled();
  });

  it('con VITE_SENTRY_REPLAY=true se suma Replay, enmascarado y con el filtro de la grabación', async () => {
    vi.stubEnv('VITE_SENTRY_REPLAY', 'true');
    expect(readSentryEnv().replay).toBe(true);
    vi.unstubAllEnvs();
    expect(initSentry(env({ replay: true }))).toBe(true);
    await vi.waitFor(() => expect(addIntegration).toHaveBeenCalledTimes(1));
    const added = addIntegration.mock.calls[0]?.[0] as { name: string };
    expect(added.name).toBe('Replay');
    expect(replayIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        beforeAddRecordingEvent: expect.any(Function) as unknown,
      }),
    );
  });

  it('el procesador del replay_event queda siempre (no hace nada sin Replay)', async () => {
    expect(names(buildSentryOptions(env()))).toEqual(
      expect.arrayContaining(['BrowserTracing', 'SplgReplayEventScrub']),
    );
    await loadReplay(env({ replay: true }));
    expect(addIntegration).toHaveBeenCalledTimes(1);
  });
});
