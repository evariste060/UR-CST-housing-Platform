import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { ApiError, api } from '../lib/api';
import { useAuth } from './useAuth';

export function useLogout() {
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  return async function logOut() {
    try {
      await api.logout();
      setUser(null);
      toast('You have signed out.');
      navigate('/');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Please try again.';
      toast(message, { type: 'error' });
    }
  };
}
