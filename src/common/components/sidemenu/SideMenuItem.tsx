
import type { IconType } from 'react-icons';
import { NavLink } from 'react-router-dom';
import pallete from '../../../theme/pallete';

interface Props {
  href: string;
  Icon: IconType;
  title: string;
  subTitle: string
}


export const SideMenuItem = ({ href, Icon, title, subTitle }: Props) => {
  return (
    <NavLink
      key={ href }
      to={ href }
      end
    >
      <div>
        <Icon />
      </div>
      <div className="flex flex-col">
        <span style={{color: 'white'}} className="text-lg font-bold leading-5">{ title }</span>
        <span style={{color: pallete.secondary.light}} className="text-sm text-black/50 hidden md:block">{ subTitle }</span>
      </div>
    </NavLink>
  );
}