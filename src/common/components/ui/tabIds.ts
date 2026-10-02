export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;

/** Atributos del panel que muestra la pestaña activa: lo asocia con su pestaña por `aria-labelledby`. */
export const tabPanelProps = (idPrefix: string, activeId: string) =>
  ({ role: 'tabpanel', id: `${idPrefix}-panel`, 'aria-labelledby': tabId(idPrefix, activeId) }) as const;
