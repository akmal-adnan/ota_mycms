import apiClient from './client';
import type { LoginResponse, SignupResponse, MeResponse } from '../types';

export async function loginApi(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  return data;
}

export async function signupApi(
  email: string,
  password: string,
): Promise<SignupResponse> {
  const { data } = await apiClient.post<SignupResponse>('/auth/signup', {
    email,
    password,
  });
  return data;
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function meApi(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>('/auth/me');
  return data;
}
