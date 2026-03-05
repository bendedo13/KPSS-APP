import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: '@salen_hocam:access_token',
  USER_ID: '@salen_hocam:user_id',
  USER_EMAIL: '@salen_hocam:user_email',
  USER_NAME: '@salen_hocam:user_name',
};

export const storage = {
  async setAccessToken(token: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.ACCESS_TOKEN, token);
  },

  async getAccessToken(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
  },

  async setUserData(userId: string, email: string, name: string): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(KEYS.USER_ID, userId),
      AsyncStorage.setItem(KEYS.USER_EMAIL, email),
      AsyncStorage.setItem(KEYS.USER_NAME, name),
    ]);
  },

  async getUserData(): Promise<{ userId: string; email: string; name: string } | null> {
    const [userId, email, name] = await Promise.all([
      AsyncStorage.getItem(KEYS.USER_ID),
      AsyncStorage.getItem(KEYS.USER_EMAIL),
      AsyncStorage.getItem(KEYS.USER_NAME),
    ]);

    if (userId && email && name) {
      return { userId, email, name };
    }
    return null;
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEYS.ACCESS_TOKEN,
      KEYS.USER_ID,
      KEYS.USER_EMAIL,
      KEYS.USER_NAME,
    ]);
  },
};
