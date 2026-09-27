/** Une clases condicionales: cx('a', cond && 'b') → 'a b'. */
export const cx = (...clases: Array<string | false | null | undefined>): string => clases.filter(Boolean).join(' ');
