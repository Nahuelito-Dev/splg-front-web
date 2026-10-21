/** Los tests de fechas esperan hora argentina: la zona se fija antes de que arranquen los workers. */
export default function setup() {
  process.env.TZ = 'America/Argentina/Buenos_Aires';
}
