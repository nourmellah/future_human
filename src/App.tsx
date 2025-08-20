// App.tsx
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoadingOverlay from "./components/LoadingOverlay";
import Account from "./pages/Account";
import CreateAgentPage from "./pages/CreateAgentPage";
import { AuthProvider } from "./auth/AuthProvider";
import Protected from "./auth/Protected";

// Lazy-load pages (adjust paths to your project)
const AuthScreens = lazy(() => import("./pages/Auth"));

// Minimal placeholders (black background)
const Home = () => (
  <div className="min-h-screen bg-black text-white grid place-items-center">
    Home
  </div>
);
const Dashboard = () => (
  <div className="min-h-screen bg-black text-white grid place-items-center">
    Dashboard
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <LoadingOverlay />
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthScreens defaultMode="login" />} />
            <Route path="/account" element={
              <Protected>
                <Account />
              </Protected>
            } />
            <Route path="/create" element={
              <Protected>
                <CreateAgentPage />
              </Protected>
            } />

            <Route path="/dashboard" element={<Dashboard />} />
            {/* catch-all → auth */}
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
