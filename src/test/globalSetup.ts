/**
 * Los tests de fechas esperan hora argentina: la zona se fija antes de que arranquen los workers. `SPLG_TEST_TZ`
 * permite correr la misma suite en otra zona (`npm run test:utc`).
 */
export default function setup() {
  process.env.TZ = process.env.SPLG_TEST_TZ ?? 'America/Argentina/Buenos_Aires';
}
