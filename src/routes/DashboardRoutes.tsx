import { Navigate, Route, Routes } from 'react-router-dom';

import { useAppDispatch } from '../hooks';
import { logOut } from '../store/auth';

import { Home, Users } from '../pages';
import { DashboardLayout } from '../common/layout';


export const DashboardRoutes = () => {
    const expireTimestampString = localStorage.getItem("expireTimestamp");
    const dispatch = useAppDispatch();
  
    if (expireTimestampString) {
      const parsedDate = new Date(parseInt(expireTimestampString!, 10));
      const currentDate = new Date();
      if (parsedDate < currentDate) {
        dispatch(logOut({}));
      }
    }
    return (
        <>
            <DashboardLayout>
                <Routes>
                    <Route path='home' element={<Home />} />
                    <Route path='users' element={<Users />} />
                    <Route path='/*' element={<Navigate to="/home" />} />
                </Routes>

            </DashboardLayout >
        </>
    )
}
