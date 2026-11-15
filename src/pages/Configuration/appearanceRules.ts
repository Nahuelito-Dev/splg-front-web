import { z } from 'zod';
import type { CompanyTheme, CompanyThemeBody, ThemeContrast } from '../../services/api/types';

/** Mismas reglas que `CompanyThemeDto` del back: `#RRGGBB` y nombre de 2 a 60 caracteres (vacío = el de la empresa). */
export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 60;

const color = z.string().trim().regex(HEX_COLOR, 'Tiene que ser un color #RRGGBB');

export const appearanceSchema = z
  .object({
    primaryColor: color,
    customAccent: z.boolean(),
    accentColor: z.string().trim(),
    displayName: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || (value.length >= DISPLAY_NAME_MIN && value.length <= DISPLAY_NAME_MAX),
        `Tiene que tener entre ${DISPLAY_NAME_MIN} y ${DISPLAY_NAME_MAX} caracteres`,
      )
      .refine((value) => !/[<>]/.test(value), 'No puede tener los signos < ni >'),
  })
  .superRefine((values, ctx) => {
    if (values.customAccent && !HEX_COLOR.test(values.accentColor)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accentColor'], message: 'Tiene que ser un color #RRGGBB' });
    }
  });

export type AppearanceFormValues = z.infer<typeof appearanceSchema>;

export const valuesOf = (theme: CompanyTheme): AppearanceFormValues => ({
  primaryColor: theme.primaryColor,
  customAccent: theme.accentColor !== null,
  accentColor: theme.accentColor ?? theme.tokens.light.accent,
  displayName: theme.displayName ?? '',
});

/** El cuerpo del `PUT` y de la vista previa: el color en mayúsculas, sin acento si se deriva, sin nombre si está vacío. */
export const toThemeBody = (values: AppearanceFormValues): CompanyThemeBody => ({
  primaryColor: values.primaryColor.trim().toUpperCase(),
  accentColor: values.customAccent ? values.accentColor.trim().toUpperCase() : null,
  displayName: values.displayName.trim().replace(/\s+/g, ' ') || null,
});

/** Nombre legible de cada par que mide el back. */
const PAIR_LABEL: Record<string, string> = {
  'onPrimary/primary': 'Texto de los botones sobre el color principal',
  'onPrimary/gradientTo': 'Texto de los botones sobre el degradé',
  'primary/surface': 'Color principal sobre el blanco',
  'primary/canvas': 'Color principal sobre el fondo del panel',
  'accent/surface': 'Acento sobre el blanco',
  'accent/canvas': 'Acento sobre el fondo del panel',
  'primaryStrong/primarySoft': 'Texto destacado sobre el fondo suave',
};

export const pairLabel = (pair: string): string => PAIR_LABEL[pair] ?? pair;

/** «4,5:1». */
export const ratioLabel = (ratio: number): string => `${ratio.toLocaleString('es-AR', { maximumFractionDigits: 2 })}:1`;

/** Los pares de un modo, en el orden del back. */
export const contrastOf = (contrast: ThemeContrast[], mode: 'light' | 'dark') =>
  contrast.filter((item) => item.mode === mode);
