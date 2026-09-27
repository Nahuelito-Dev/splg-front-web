import { forwardRef, type InputHTMLAttributes } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { cx } from './cx';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Nombre accesible del buscador. */
  label: string;
}

export const SearchInput = forwardRef<HTMLInputElement, Props>(({ label, className, ...rest }, ref) => (
  <label className={cx('relative block w-full sm:w-72', className)}>
    <span className="sr-only">{label}</span>
    <SearchIcon
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-1/2 !h-4 !w-4 -translate-y-1/2 text-faint"
    />
    <input
      ref={ref}
      type="search"
      className="h-9 w-full rounded-[10px] border border-outline bg-surface pl-9 pr-3 text-[13px] text-ink shadow-control placeholder:text-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      {...rest}
    />
  </label>
));
SearchInput.displayName = 'SearchInput';
