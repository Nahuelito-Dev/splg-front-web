import type { ChatLabelColor } from '../../../services/api/chatLabels';

/**
 * Cómo se pinta cada color de la paleta de etiquetas (la API guarda la clave, nunca un color). La marca Brasa tiene
 * siete tonos (neutro, peligro, primario, aviso, éxito, información y tinta): para que las diez claves se distingan,
 * cuatro van en su versión llena (fondo del tono y texto de la superficie). Cada par llega a 4,5:1 en claro y oscuro
 * (lo controla labelColors.test.ts). Las suaves llevan un borde del color del texto: en oscuro su fondo casi no se
 * separa de la superficie; las llenas se separan por el relleno. Borde y relleno llegan a 3:1 contra la superficie en
 * los dos temas. El nombre es el que se ve en el selector.
 */
export const LABEL_COLORS: Record<ChatLabelColor, { name: string; classes: string }> = {
  gray: { name: 'Gris', classes: 'border-current bg-surface-muted text-ink-2' },
  red: { name: 'Rojo', classes: 'border-current bg-danger-soft text-danger' },
  orange: { name: 'Naranja', classes: 'border-current bg-primary-soft text-on-primary-soft' },
  yellow: { name: 'Ámbar', classes: 'border-current bg-warn-soft text-warn' },
  green: { name: 'Verde', classes: 'border-current bg-success-soft text-success' },
  teal: { name: 'Verde intenso', classes: 'border-transparent bg-success text-surface' },
  blue: { name: 'Azul', classes: 'border-current bg-info-soft text-info' },
  indigo: { name: 'Azul intenso', classes: 'border-transparent bg-info text-surface' },
  purple: { name: 'Grafito', classes: 'border-transparent bg-ink text-surface' },
  pink: { name: 'Rojo intenso', classes: 'border-transparent bg-danger text-surface' },
};

const isLabelColor = (value: string): value is ChatLabelColor => value in LABEL_COLORS;

/** Las clases de un color; uno que el panel todavía no conoce se pinta gris. */
export const labelColorClasses = (color: string): string =>
  (isLabelColor(color) ? LABEL_COLORS[color] : LABEL_COLORS.gray).classes;
