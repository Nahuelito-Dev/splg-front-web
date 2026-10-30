export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

export const AVATAR_SIZES: Record<AvatarSize, string> = {
  lg: 'h-14 w-14 text-xl',
  md: 'h-[30px] w-[30px] text-[11px]',
  sm: 'h-6 w-6 text-[10px]',
  xs: 'h-5 w-5 text-[9px]',
};
