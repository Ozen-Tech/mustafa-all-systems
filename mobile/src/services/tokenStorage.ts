import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function setAuthSession(
  accessToken: string,
  refreshToken: string,
  userJson: string
): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
    [USER_KEY, userJson],
  ]);
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
}

export async function getStoredUserJson(): Promise<string | null> {
  return AsyncStorage.getItem(USER_KEY);
}

export async function setStoredUserJson(userJson: string): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, userJson);
}
