import { Navigate, Route, Routes } from "react-router-dom";
import { routes } from "./routes";
import ProtectedRoute from "../Components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            route.roles
              ? <ProtectedRoute roles={route.roles}>{route.element}</ProtectedRoute>
              : route.element
          }
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}