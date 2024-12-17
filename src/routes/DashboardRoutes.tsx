import { Navigate, Route, Routes } from "react-router-dom";

import { useAppDispatch } from "../hooks";
import { logOut } from "../store/auth";

import { Home, Leads } from "../pages";
import { DashboardLayout } from "../common/layout";
import { LeadsDetailsView } from '../pages/Leads/components/LeadsDetailsView';

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
          <Route path="home" element={<Home />} />
          <Route path="leads" element={<Leads />} />
          <Route
            path="leads/details/:leadId"
            element={<LeadsDetailsView />}
          />
          <Route path="/*" element={<Navigate to="/home" />} />
        </Routes>
      </DashboardLayout>
    </>
  );
};
