import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'tauros_access_token';
const REFRESH_KEY = 'tauros_refresh_token';

export async function saveAccessToken(token: string) {
  return SecureStore.setItemAsync(ACCESS_KEY, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
}

export async function saveRefreshToken(token: string) {
  return SecureStore.setItemAsync(REFRESH_KEY, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function deleteTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
