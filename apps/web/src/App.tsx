import { Link, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireRole } from './auth/RequireRole';
import { AppLayout } from './components/AppLayout';
import { Icon } from './components/Icon';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HealthPage } from './pages/HealthPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RoleHomePage } from './pages/RoleHomePage';

// Pages that later phases build. Each stands in with ComingSoonPage until then.
const PUBLIC_PAGES_TO_BUILD = [
  '/how-it-works',
  '/search',
  '/properties/:id',
  '/saved',
  '/compare',
  '/history',
  '/help',
  '/account',
  '/notifications',
];
const LANDLORD_PAGES_TO_BUILD = [
  '/landlord/properties',
  '/landlord/properties/new',
  '/landlord/inquiries',
  '/landlord/account',
];
const ADMIN_PAGES_TO_BUILD = [
  '/admin/review',
  '/admin/users',
  '/admin/reports',
  '/admin/locations',
];

function NotFoundPage() {
  return (
    <main className="page" id="main">
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
      <Route element={<AppLayout />}>
        <Route path="/" element={<HealthPage />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
        {PUBLIC_PAGES_TO_BUILD.map((path) => (
          <Route key={path} path={path} element={<ComingSoonPage />} />
        ))}

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
          {LANDLORD_PAGES_TO_BUILD.map((path) => (
            <Route key={path} path={path} element={<ComingSoonPage />} />
          ))}
        </Route>
        <Route element={<RequireRole allow="ADMIN" />}>
          <Route path="/admin" element={<RoleHomePage title="Administrator dashboard" />} />
          {ADMIN_PAGES_TO_BUILD.map((path) => (
            <Route key={path} path={path} element={<ComingSoonPage />} />
          ))}
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
