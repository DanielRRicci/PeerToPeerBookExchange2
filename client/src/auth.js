const AUTH_STORAGE_KEY = "bookExchangeUser";

// Reads the logged-in user payload from localStorage safely.
export function getStoredUser() {
  try {
    const value = localStorage.getItem(AUTH_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch (_error) {
    return null;
  }
}

// Persists logged-in user info after successful authentication.
export function setStoredUser(user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

// Clears local auth state so protected pages can no longer be accessed.
export function clearStoredUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
