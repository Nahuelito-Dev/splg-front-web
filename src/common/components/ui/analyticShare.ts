/** Porción del total que cae en cada estado, de 0 a 1. Sin total o sin dato, 0. */
export const shareOf = (count: number | null, total: number) => (count === null || total <= 0 ? 0 : count / total);
