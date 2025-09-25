import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/components/auth/LocalAuthWrapper';
import AppLayout from '@/components/AppLayout';
import Login from '@/pages/SubLogin';
import DTRDashboard from '@/pages/DTRDashboard';
import AssetManagement from '@/pages/AssetManagement';
import Users from '@/pages/Users';
import UserDetail from '@/pages/UserDetail';
import AddUser from '@/pages/AddUser';
import RoleManagement from '@/pages/RoleManagement';
import Tickets from '@/pages/Tickets';
import TicketView from '@/pages/TicketView';
import AddTicket from '@/pages/AddTicket';
import DataLogger from '@/pages/DataLogger';
import MetersList from '@/pages/MetersList';
import MeterDetails from '@/pages/MeterDetails';
import Feeders from '@/pages/Feeders';
import DTRDetailPage from './pages/DTRDetailPage';
import DTRTable from './pages/DTRTable';
import ProtectedRoute from './components/auth/LocalProtectedRoute';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <Router basename="/v2/tgnpdcl_smart">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                <AppLayout>
                <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<DTRDashboard />} />
                    <Route path="/asset-management" element={<AssetManagement />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/users/:userId" element={<UserDetail />} />
                    <Route path="/add-user" element={<AddUser />} />
                    <Route path="/role-management" element={<RoleManagement />} />
                    <Route path="/tickets" element={<Tickets />} />
                    <Route path="/tickets/:ticketId" element={<TicketView />} />
                    <Route path="/tickets/:ticketId/edit" element={<AddTicket />} />
                    <Route path="/add-ticket" element={<AddTicket />} />
                    <Route path="/data-logger" element={<DataLogger />} />
                    <Route path="/meters" element={<MetersList />} />
                    <Route path="/meter-details/:meterId" element={<MeterDetails />} />
                    <Route path="/dtr-detail/:dtrId" element={<DTRDetailPage />} />
                    <Route path="/feeder/:feederId" element={<Feeders />} />
                    <Route path="/dtr-table" element={<DTRTable />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </AppLayout>
           
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
};
export default App;