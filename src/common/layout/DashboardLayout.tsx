import { Outlet } from 'react-router-dom';
import { SideMenu } from '../components';
interface Props {
  children: JSX.Element | JSX.Element[];
}

export const DashboardLayout = ({ children }: Props) => {
  return (
    <div style={{ backgroundColor: '#E2E1CD' }} className=" overflow-y-hidden w-screen h-screen antialiased text-slate-900 selection:bg-blue-900 selection:text-white">
      <div className="flex flex-row relative w-screen">
        <SideMenu />

        <div className="w-full p-4 flex items-center justify-center">
          {/* <Outlet /> */}
          {children}
        </div>
      </div>

    </div>
  )
}
