import Landing from "../features/customer/Landing";
import Login from "../features/auth/Login";
import Register from "../features/auth/Register";
import CustomerDashboard from "../features/customer/Dashboard";
import EmergencyHelp from "../features/customer/EmergencyHelp";
import MyVehicles from "../features/customer/MyVehicles";
import FindMechanics from "../features/customer/FindMechanics";
import MyRequests from "../features/customer/MyRequests";
import LiveTracking from "../features/customer/LiveTracking";
import CustomerPayments from "../features/customer/Payments";
import CustomerReviews from "../features/customer/Reviews";
import CustomerProfile from "../features/customer/Profile";
import MechanicDashboard from "../features/mechanic/Dashboard";
import EmergencyRequests from "../features/mechanic/EmergencyRequests";
import ActiveJobs from "../features/mechanic/ActiveJobs";
import JobHistory from "../features/mechanic/JobHistory";
import Earnings from "../features/mechanic/Earnings";
import MechanicReviews from "../features/mechanic/Reviews";
import MechanicProfile from "../features/mechanic/Profile";
import AdminDashboard from "../features/admin/Dashboard";
import Users from "../features/admin/Users";
import Mechanics from "../features/admin/Mechanics";
import Verification from "../features/admin/Verification";
import AdminRequests from "../features/admin/EmergencyRequests";
import AdminPayments from "../features/admin/Payments";
import Reports from "../features/admin/Reports";

export const routes = [
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },

  { path: "/customer", element: <CustomerDashboard />, roles: ["customer"] },
  { path: "/customer/emergency", element: <EmergencyHelp />, roles: ["customer"] },
  { path: "/customer/vehicles", element: <MyVehicles />, roles: ["customer"] },
  { path: "/customer/mechanics", element: <FindMechanics />, roles: ["customer"] },
  { path: "/customer/requests", element: <MyRequests />, roles: ["customer"] },
  { path: "/customer/tracking", element: <LiveTracking />, roles: ["customer"] },
  { path: "/customer/payments", element: <CustomerPayments />, roles: ["customer"] },
  { path: "/customer/reviews", element: <CustomerReviews />, roles: ["customer"] },
  { path: "/customer/profile", element: <CustomerProfile />, roles: ["customer"] },

  { path: "/mechanic", element: <MechanicDashboard />, roles: ["mechanic"] },
  { path: "/mechanic/requests", element: <EmergencyRequests />, roles: ["mechanic"] },
  { path: "/mechanic/jobs", element: <ActiveJobs />, roles: ["mechanic"] },
  { path: "/mechanic/history", element: <JobHistory />, roles: ["mechanic"] },
  { path: "/mechanic/earnings", element: <Earnings />, roles: ["mechanic"] },
  { path: "/mechanic/reviews", element: <MechanicReviews />, roles: ["mechanic"] },
  { path: "/mechanic/profile", element: <MechanicProfile />, roles: ["mechanic"] },

  { path: "/admin", element: <AdminDashboard />, roles: ["admin"] },
  { path: "/admin/users", element: <Users />, roles: ["admin"] },
  { path: "/admin/mechanics", element: <Mechanics />, roles: ["admin"] },
  { path: "/admin/verification", element: <Verification />, roles: ["admin"] },
  { path: "/admin/requests", element: <AdminRequests />, roles: ["admin"] },
  { path: "/admin/payments", element: <AdminPayments />, roles: ["admin"] },
  { path: "/admin/reports", element: <Reports />, roles: ["admin"] }
];