class SessionManager {
  private static instance: SessionManager;
  private sessionId: string;
  private storagePrefix: string;
  private tabRole: string | null = null; // Tab-specific role override

  private constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.storagePrefix = `ur_${this.sessionId}_`;
    
    // Check for tab-specific role in URL or session storage
    this.initializeTabRole();
  }

  private initializeTabRole() {
    try {
      // Check URL parameters for role specification
      const urlParams = new URLSearchParams(window.location.search);
      const urlRole = urlParams.get('role');
      
      // Check if this tab was opened with a specific role context
      const tabRole = sessionStorage.getItem('ur_tab_role');
      
      if (urlRole && ['admin', 'worker', 'citizen'].includes(urlRole)) {
        this.tabRole = urlRole;
        sessionStorage.setItem('ur_tab_role', urlRole);
      } else if (tabRole) {
        this.tabRole = tabRole;
      }
    } catch (error) {
      console.debug('Failed to initialize tab role:', error);
    }
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

  // Tab-specific role management
  setTabRole(role: string) {
    this.tabRole = role;
    try {
      sessionStorage.setItem('ur_tab_role', role);
    } catch (error) {
      console.warn('Failed to set tab role:', error);
    }
  }

  getTabRole(): string | null {
    if (this.tabRole) return this.tabRole;
    
    try {
      return sessionStorage.getItem('ur_tab_role');
    } catch (error) {
      console.debug('Failed to get tab role:', error);
      return null;
    }
  }

  clearTabRole() {
    this.tabRole = null;
    try {
      sessionStorage.removeItem('ur_tab_role');
    } catch (error) {
      console.debug('Failed to clear tab role:', error);
    }
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