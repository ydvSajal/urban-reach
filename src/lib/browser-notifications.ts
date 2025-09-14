// Browser Notification Service
// Handles browser push notifications with permission management

export interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  actions?: NotificationAction[];
}

export interface NotificationPermissionState {
  permission: NotificationPermission;
  supported: boolean;
}

class BrowserNotificationService {
  private static instance: BrowserNotificationService;
  private permissionState: NotificationPermission = 'default';
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'Notification' in window;
    if (this.isSupported) {
      this.permissionState = Notification.permission;
    }
  }

  static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService();
    }
    return BrowserNotificationService.instance;
  }

  /**
   * Check if browser notifications are supported
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current permission state
   */
  getPermissionState(): NotificationPermissionState {
    return {
      permission: this.permissionState,
      supported: this.isSupported,
    };
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Browser notifications are not supported');
    }

    if (this.permissionState === 'granted') {
      return this.permissionState;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionState = permission;
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  /**
   * Show a browser notification
   */
  async showNotification(options: BrowserNotificationOptions): Promise<Notification | null> {
    if (!this.isSupported) {
      console.warn('Browser notifications are not supported');
      return null;
    }

    if (this.permissionState !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Check if the page is visible - don't show notifications if user is actively using the app
    if (document.visibilityState === 'visible') {
      console.log('Page is visible, skipping browser notification');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        actions: options.actions || [],
      });

      // Auto-close notification after 5 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      throw error;
    }
  }

  /**
   * Show notification for report status change
   */
  async showStatusChangeNotification(
    reportNumber: string,
    oldStatus: string,
    newStatus: string,
    reportId?: string
  ): Promise<Notification | null> {
    return this.showNotification({
      title: `Report #${reportNumber} Updated`,
      body: `Status changed from ${oldStatus} to ${newStatus}`,
      tag: `status-${reportId}`,
      data: { type: 'status_change', reportId, reportNumber },
      icon: '/favicon.ico',
    });
  }

  /**
   * Show notification for new assignment
   */
  async showAssignmentNotification(
    reportNumber: string,
    reportTitle: string,
    reportId?: string
  ): Promise<Notification | null> {
    return this.showNotification({
      title: 'New Assignment',
      body: `You've been assigned to Report #${reportNumber}: ${reportTitle}`,
      tag: `assignment-${reportId}`,
      data: { type: 'assignment', reportId, reportNumber },
      requireInteraction: true,
      icon: '/favicon.ico',
    });
  }

  /**
   * Show notification for new report (admins)
   */
  async showNewReportNotification(
    reportNumber: string,
    category: string,
    location: string,
    reportId?: string
  ): Promise<Notification | null> {
    return this.showNotification({
      title: 'New Report Submitted',
      body: `${category.replace('_', ' ')} report from ${location}`,
      tag: `new-report-${reportId}`,
      data: { type: 'new_report', reportId, reportNumber },
      icon: '/favicon.ico',
    });
  }

  /**
   * Show generic system notification
   */
  async showSystemNotification(
    title: string,
    message: string,
    data?: any
  ): Promise<Notification | null> {
    return this.showNotification({
      title,
      body: message,
      tag: 'system',
      data: { type: 'system', ...data },
      icon: '/favicon.ico',
    });
  }

  /**
   * Clear all notifications with a specific tag
   */
  clearNotificationsByTag(tag: string): void {
    // Note: This is limited by browser APIs - we can only close notifications we created
    // in the current session. Service Worker notifications would need different handling.
    console.log(`Clearing notifications with tag: ${tag}`);
  }

  /**
   * Set up notification click handlers
   */
  setupNotificationHandlers(): void {
    if (!this.isSupported) return;

    // Handle notification clicks
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'notification-click') {
          this.handleNotificationClick(event.data);
        }
      });
    }
  }

  /**
   * Handle notification click events
   */
  private handleNotificationClick(data: any): void {
    const { type, reportId, reportNumber } = data;

    switch (type) {
      case 'status_change':
      case 'assignment':
        if (reportId) {
          // Navigate to report detail page
          window.location.href = `/reports/${reportId}`;
        }
        break;
      case 'new_report':
        if (reportId) {
          window.location.href = `/reports/${reportId}`;
        } else {
          window.location.href = '/reports';
        }
        break;
      case 'system':
        // Handle system notifications
        window.focus();
        break;
      default:
        window.focus();
    }
  }

  /**
   * Check if notifications should be shown based on user preferences
   */
  shouldShowNotification(type: 'status_change' | 'assignment' | 'new_report' | 'system'): boolean {
    // This would integrate with user notification preferences
    // For now, return true if permission is granted
    return this.permissionState === 'granted';
  }

  /**
   * Test notification (for settings/debugging)
   */
  async testNotification(): Promise<Notification | null> {
    return this.showNotification({
      title: 'Test Notification',
      body: 'This is a test notification from the Municipal System',
      tag: 'test',
      data: { type: 'test' },
    });
  }
}

// Export singleton instance
export const browserNotificationService = BrowserNotificationService.getInstance();

// Utility functions for easy access
export const requestNotificationPermission = () => 
  browserNotificationService.requestPermission();

export const showStatusChangeNotification = (
  reportNumber: string,
  oldStatus: string,
  newStatus: string,
  reportId?: string
) => browserNotificationService.showStatusChangeNotification(reportNumber, oldStatus, newStatus, reportId);

export const showAssignmentNotification = (
  reportNumber: string,
  reportTitle: string,
  reportId?: string
) => browserNotificationService.showAssignmentNotification(reportNumber, reportTitle, reportId);

export const showNewReportNotification = (
  reportNumber: string,
  category: string,
  location: string,
  reportId?: string
) => browserNotificationService.showNewReportNotification(reportNumber, category, location, reportId);

export const showSystemNotification = (title: string, message: string, data?: any) =>
  browserNotificationService.showSystemNotification(title, message, data);

export const isNotificationSupported = () => 
  browserNotificationService.isNotificationSupported();

export const getNotificationPermissionState = () =>
  browserNotificationService.getPermissionState();

// Initialize notification handlers
browserNotificationService.setupNotificationHandlers();