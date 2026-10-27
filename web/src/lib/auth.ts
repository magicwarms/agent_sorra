const TOKEN_KEY = "sorra.token";

let memoryToken: string | null = null;

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
};

export const setToken = (token: string) => {
  memoryToken = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage diblokir, token tetap hidup di memori selama tab terbuka
  }
};

export const clearToken = () => {
  memoryToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // tidak ada yang perlu dihapus
  }
};
