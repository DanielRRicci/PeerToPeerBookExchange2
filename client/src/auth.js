const AUTH_STORAGE_KEY = "bookExchangeUser";
const AUTH_CHANGE_EVENT = "bookExchangeAuthChange";

function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

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
  emitAuthChange();
}

// Clears local auth state so protected pages can no longer be accessed.
export function clearStoredUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  emitAuthChange();
}

export function subscribeToAuthChanges(callback) {
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
