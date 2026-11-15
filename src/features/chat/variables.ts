/** Las variables `{{…}}` de las respuestas guardadas de la bandeja (las completa el back con `templateId`). */
const VARIABLE = /\{\{\s*([^}]*?)\s*\}\}/g;

/** Completa las variables conocidas; devuelve las que quedaron sin valor (o que no existen). */
export const fillVariables = (
  text: string,
  values: Readonly<Record<string, string | null>>,
): { text: string; missing: string[] } => {
  const missing: string[] = [];
  const filled = text.replace(VARIABLE, (whole, name: string) => {
    const value = values[name];
    if (value) return value;
    if (!missing.includes(name)) missing.push(name);
    return whole;
  });
  return { text: filled, missing };
};
