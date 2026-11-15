/** Relación de contraste WCAG 2.x entre dos colores `#RRGGBB`. */
export const contrast = (first: string, second: string): number => {
  const luminance = (hex: string) => {
    const [red, green, blue] = [1, 3, 5].map((index) => {
      const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
};

/** Blanco o tinta, el que llegue al contraste de texto (o el más legible). */
export const onColor = (background: string): string => {
  const white = '#FFFFFF';
  const ink = '#0B1220';
  if (contrast(white, background) >= 4.5) return white;
  if (contrast(ink, background) >= 4.5) return ink;
  return contrast(white, background) >= contrast(ink, background) ? white : ink;
};

/** Variante clara de una marca para un fondo oscuro fijo, sin perder su tono. */
export const colorOnDarkSurface = (color: string, surface: string, minimum: number): string => {
  if (contrast(color, surface) >= minimum) return color;
  const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16));
  for (let step = 1; step <= 255; step += 1) {
    const ratio = step / 255;
    const candidate = `#${channels
      .map((channel) =>
        Math.round(channel + (255 - channel) * ratio)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;
    if (contrast(candidate, surface) >= minimum) return candidate;
  }
  return '#FFFFFF';
};
