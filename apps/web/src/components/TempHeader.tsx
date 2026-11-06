import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ApiError, api } from '../lib/api';
import { useToast } from './Toast';

/** Temporary. Phase 3 replaces this with PublicHeader and AppShell. */
export function TempHeader() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  async function logOut() {
    try {
      await api.logout();
      setUser(null);
      toast('You have signed out.');
      navigate('/');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Please try again.');
    }
  }

  return (
    <header className="temp-header">
      <Link className="brand" to="/">
        UR-CST Student Housing
      </Link>
      {user ? (
        <button type="button" className="btn btn-secondary" onClick={logOut}>
          Log out
        </button>
      ) : (
        <Link className="btn btn-secondary" to="/login">
          Log in
        </Link>
      )}
    </header>
  );
}
