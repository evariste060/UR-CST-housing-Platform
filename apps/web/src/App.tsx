import { Link, Outlet, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireRole } from './auth/RequireRole';
import { Icon } from './components/Icon';
import { TempHeader } from './components/TempHeader';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HealthPage } from './pages/HealthPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RoleHomePage } from './pages/RoleHomePage';

function Layout() {
  return (
    <>
      <TempHeader />
      <Outlet />
    </>
  );
}

function NotFoundPage() {
  return (
    <main className="page">
      <div className="state error">
        <span className="state-ic">
          <Icon name="alert" />
        </span>
        <h1 className="state-title">Page not found</h1>
        <p>This page does not exist. Check the address or go back to the home page.</p>
        <Link className="btn btn-primary" to="/">
          Go to home
        </Link>
      </div>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HealthPage />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<RequireRole allow="STUDENT" />}>
          <Route path="/student" element={<RoleHomePage title="Student dashboard" />} />
        </Route>
        <Route element={<RequireRole allow="LANDLORD" />}>
          <Route path="/landlord" element={<RoleHomePage title="Landlord dashboard" />} />
        </Route>
        <Route element={<RequireRole allow="ADMIN" />}>
          <Route path="/admin" element={<RoleHomePage title="Administrator dashboard" />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
