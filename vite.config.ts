import { readFileSync } from 'node:fs'
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// Source maps a Sentry sólo si el build tiene SENTRY_AUTH_TOKEN (el deploy). Sin token el build es el de siempre:
// sin mapas y sin subir nada. Los .map se borran después de subirlos: no se publican en Firebase Hosting.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN

// Si la subida falla (token vencido, Sentry caído) el build sigue, pero que se vea: en GitHub Actions queda como
// anotación de advertencia en el resumen del deploy; fuera de CI, un aviso en la consola.
const onSentryUploadError = (err: Error) => {
  const message = `No se pudieron subir los source maps a Sentry: ${err.message}`.replace(/\r?\n/g, ' ')
  if (process.env.GITHUB_ACTIONS === 'true') console.log(`::warning title=Sentry source maps::${message}`)
  else console.warn(message)
}

const sentry = (): PluginOption[] =>
  sentryAuthToken
    ? [
        sentryVitePlugin({
          org: process.env.SENTRY_ORG ?? 'wagners-labs',
          project: process.env.SENTRY_PROJECT ?? 'splg-frontend',
          authToken: sentryAuthToken,
          release: { name: `splg-frontend@${version}` },
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          telemetry: false,
          errorHandler: onSentryUploadError,
        }),
      ]
    : []

// https://vitejs.dev/config/
export default defineConfig({
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(version) },
  build: { sourcemap: sentryAuthToken ? 'hidden' : false },
  // El plugin de Sentry va último (lo pide su documentación).
  plugins: [react(), ...sentry()],
})
