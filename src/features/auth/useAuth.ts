import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { loginRequest, logoutRequest, registerRequest } from './auth.api';
import { authStart, logout as logoutAction, setCredentials } from './authSlice';
import type { LoginInput, RegisterInput } from './auth.schemas';

export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, status } = useAppSelector((s) => s.auth);

  const login = useMutation({
    mutationFn: (input: LoginInput) => {
      dispatch(authStart());
      return loginRequest(input);
    },
    onSuccess: (data) => {
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
      navigate('/', { replace: true });
    },
    onError: () => {
      dispatch(logoutAction());
    },
  });

  const register = useMutation({
    mutationFn: (input: RegisterInput) => {
      dispatch(authStart());
      return registerRequest(input);
    },
    onSuccess: (data) => {
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
      navigate('/', { replace: true });
    },
    onError: () => {
      dispatch(logoutAction());
    },
  });

  const logout = useMutation({
    mutationFn: () => logoutRequest(),
    onSettled: () => {
      dispatch(logoutAction());
      navigate('/login', { replace: true });
    },
  });

  return {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    login,
    register,
    logout,
  };
}
