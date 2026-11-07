import { Link, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireRole } from './auth/RequireRole';
import { AppLayout } from './components/AppLayout';
import { Icon } from './components/Icon';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { AccountPage } from './pages/AccountPage';
import { ComparePage } from './pages/ComparePage';
import { ContactPage } from './pages/ContactPage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/landlord/DashboardPage';
import { InquiriesPage } from './pages/landlord/InquiriesPage';
import { PreviewPage } from './pages/landlord/PreviewPage';
import { PropertiesPage } from './pages/landlord/PropertiesPage';
import { SubmittedPage } from './pages/landlord/SubmittedPage';
import { WizardPage } from './pages/landlord/WizardPage';
import { LoginPage } from './pages/LoginPage';
import { PropertyPage } from './pages/PropertyPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RoleHomePage } from './pages/RoleHomePage';
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { buttonClass } from './components/Button';

// Pages that later phases build. Each stands in with ComingSoonPage until then.
const PUBLIC_PAGES_TO_BUILD = ['/help', '/notifications'];
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
        <Link className={buttonClass()} to="/">
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-it-works" element={<LandingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/properties/:id" element={<PropertyPage />} />
        <Route path="/properties/:id/contact" element={<ContactPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/history" element={<HistoryPage />} />
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
          <Route path="/student" element={<StudentDashboardPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route element={<RequireRole allow="LANDLORD" />}>
          <Route path="/landlord" element={<DashboardPage />} />
          <Route path="/landlord/properties" element={<PropertiesPage />} />
          <Route path="/landlord/properties/new" element={<WizardPage key="new" />} />
          <Route path="/landlord/properties/:id/edit" element={<WizardPage key="edit" />} />
          <Route path="/landlord/properties/:id/preview" element={<PreviewPage />} />
          <Route path="/landlord/properties/:id/submitted" element={<SubmittedPage />} />
          <Route path="/landlord/inquiries" element={<InquiriesPage />} />
          <Route path="/landlord/account" element={<AccountPage />} />
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
