import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SidebarLayout from "./SidebarLayout";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) {
    const target = user.role === "admin" ? "/admin" : user.role === "mechanic" ? "/mechanic" : "/customer";
    return <Navigate to={target} replace />;
  }

  return <SidebarLayout>{children}</SidebarLayout>;
}