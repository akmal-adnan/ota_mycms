import apiClient from './client';
import type {
  LoginResponse,
  SignupResponse,
  MeResponse,
  ApiKeyInfo,
  ApiKeyRegenerateResponse,
} from '../types';

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

export async function getApiKeyApi(): Promise<ApiKeyInfo> {
  const { data } = await apiClient.get<ApiKeyInfo>('/auth/api-key');
  return data;
}

export async function regenerateApiKeyApi(): Promise<ApiKeyRegenerateResponse> {
  const { data } = await apiClient.post<ApiKeyRegenerateResponse>(
    '/auth/api-key/regenerate',
  );
  return data;
}
