//import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { CustomAlert } from "./common/components"
//import { AuthRoutes } from "./routes/AuthRoutes"
//import { DashboardRoutes } from "./routes/DashboardRoutes"
import { ThemeProvider } from "./theme"

import { useAppSelector } from "./hooks/reduxHooks"
import { Navigation } from "./router/Navigation"

const queryClient = new QueryClient()

export const App = () => {
  const { isOpen } = useAppSelector((state) => state.ui)
  return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <Navigation />
          {/* <BrowserRouter>
            <Routes>
              {
                status === 'authenticated'
                  ? <Route path="/*" element={<DashboardRoutes />} />
                  : <Route path="/auth/*" element={<AuthRoutes />} />
              }
              <Route path="/*" element={<Navigate to={'/auth/login'} />} />
            </Routes> */}
          <CustomAlert isOpen={isOpen} />
          {/* </BrowserRouter> */}
        </QueryClientProvider>
      </ThemeProvider>
  )
}