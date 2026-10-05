import { useMemo, useState, type ReactNode } from 'react';
import { CrumbContext, type CrumbOverride } from './crumbContext';

export const CrumbProvider = ({ children }: { children: ReactNode }) => {
  const [override, setOverride] = useState<CrumbOverride | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return <CrumbContext.Provider value={value}>{children}</CrumbContext.Provider>;
};
