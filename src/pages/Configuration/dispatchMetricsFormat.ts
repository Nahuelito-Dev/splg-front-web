/** «14 s», «2 min 5 s», «1 h 3 min». Sin dato, un guion. */
export const formatSeconds = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  const rounded = Math.round(value);
  if (rounded < 60) return `${rounded} s`;
  if (rounded < 3600) {
    const seconds = rounded % 60;
    return seconds === 0 ? `${Math.floor(rounded / 60)} min` : `${Math.floor(rounded / 60)} min ${seconds} s`;
  }
  const minutes = Math.floor((rounded % 3600) / 60);
  return minutes === 0 ? `${Math.floor(rounded / 3600)} h` : `${Math.floor(rounded / 3600)} h ${minutes} min`;
};

/** «62 %» (hasta un decimal). Sin dato, un guion. */
export const formatPercent = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : `${String(Math.round(value * 10) / 10).replace('.', ',')} %`;

/** «1,7». Sin dato, un guion. */
export const formatRatio = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : String(Math.round(value * 10) / 10).replace('.', ',');
