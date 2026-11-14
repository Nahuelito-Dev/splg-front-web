/** Con cuánto de anticipación se avisa que la sesión está por vencer. */
export const EXPIRY_WARNING_MS = 5 * 60_000;

/** `mm:ss` (o `h:mm:ss`) de lo que falta; nunca negativo. */
export const formatRemaining = (ms: number): string => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
};
