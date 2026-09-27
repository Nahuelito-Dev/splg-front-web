import StarIcon from '@mui/icons-material/Star';

interface Props {
  value: number;
  size?: 'sm' | 'md';
}

/** Cinco estrellas, las que corresponden llenas. Sólo decorativo: el número va aparte. */
export const Stars = ({ value, size = 'sm' }: Props) => {
  const dimension = size === 'sm' ? '!h-4 !w-4' : '!h-5 !w-5';
  return (
    <span aria-hidden="true" className="inline-flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className={`${dimension} ${star <= Math.round(value) ? 'text-accent' : 'text-tinta-200'}`}
        />
      ))}
    </span>
  );
};
