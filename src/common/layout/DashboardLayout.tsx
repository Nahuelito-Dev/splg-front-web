import { Outlet } from 'react-router-dom';
import { Navbar, SideMenu } from '../components';

interface Props {
  children: JSX.Element | JSX.Element[];
}

export const DashboardLayout = ({ children }: Props) => {
  return (
    <div
      style={{ backgroundColor: '#E2E1CD' }}
      className="overflow-y-hidden w-screen h-screen antialiased text-slate-900 selection:bg-blue-900 selection:text-white"
    >
      <div className="relative z-20">
        <Navbar />
      </div>
      <div className="flex w-screen h-full relative">
        <div className="z-10">
          <SideMenu />
        </div>
        <div className="w-full p-4 flex flex-col">{children}</div>
      </div>
    </div>
  );
};
