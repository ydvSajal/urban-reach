class SessionManager {
  private static instance: SessionManager;
  private sessionId: string;
  private storagePrefix: string;

  private constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.storagePrefix = `ur_${this.sessionId}_`;
  }

  static getInstance() {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  getSessionId() {
    return this.sessionId;
  }

  // Session-specific localStorage
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(`${this.storagePrefix}${key}`, value);
    } catch (error) {
      console.warn('Failed to set localStorage item:', error);
    }
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(`${this.storagePrefix}${key}`);
    } catch (error) {
      console.warn('Failed to get localStorage item:', error);
      return null;
    }
  }

  removeItem(key: string) {
    try {
      localStorage.removeItem(`${this.storagePrefix}${key}`);
    } catch (error) {
      console.warn('Failed to remove localStorage item:', error);
    }
  }

  // Global shared storage (for cross-session data)
  setGlobalItem(key: string, value: string) {
    try {
      localStorage.setItem(`ur_global_${key}`, value);
    } catch (error) {
      console.warn('Failed to set global localStorage item:', error);
    }
  }

  getGlobalItem(key: string): string | null {
    try {
      return localStorage.getItem(`ur_global_${key}`);
    } catch (error) {
      console.warn('Failed to get global localStorage item:', error);
      return null;
    }
  }

  // Cleanup session-specific data
  cleanup() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup session storage:', error);
    }
  }
}

export const sessionManager = SessionManager.getInstance();