import { Link, Route, Routes } from 'react-router-dom';
import { GuestOnly, RequireRole } from './auth/RequireRole';
import { AppLayout } from './components/AppLayout';
import { Icon } from './components/Icon';
import { AdminDashboardPage } from './pages/admin/DashboardPage';
import { AdminListingDetailPage } from './pages/admin/ListingDetailPage';
import { AdminLocationsPage } from './pages/admin/LocationsPage';
import { AdminReportsPage } from './pages/admin/ReportsPage';
import { AdminReviewPage } from './pages/admin/ReviewPage';
import { AdminUsersPage } from './pages/admin/UsersPage';
import { HelpPage } from './pages/HelpPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { StatesPage } from './pages/StatesPage';
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
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { StudentInquiriesPage } from './pages/StudentInquiriesPage';
import { buttonClass } from './components/Button';
import { t } from './i18n';

function NotFoundPage() {
  return (
    <main className="page" id="main">
      <div className="state error">
        <span className="state-ic">
          <Icon name="alert" />
        </span>
        <h1 className="state-title">{t('Page not found')}</h1>
        <p>{t('This page does not exist. Check the address or go back to the home page.')}</p>
        <Link className={buttonClass()} to="/">
          {t('Go to home')}
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
        <Route path="/states" element={<StatesPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<RequireRole allow="STUDENT" />}>
          <Route path="/student" element={<StudentDashboardPage />} />
          <Route path="/student/inquiries" element={<StudentInquiriesPage />} />
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
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/review" element={<AdminReviewPage />} />
          <Route path="/admin/review/:id" element={<AdminListingDetailPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/locations" element={<AdminLocationsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
