# Implementation Plan

- [x] 1. Fix OTP Authentication System
  - Configure Supabase email templates with the provided HTML template
  - Implement enhanced OTP verification component with proper error handling
  - Add retry mechanisms and rate limiting for OTP requests
  - Test authentication flow with real email delivery
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 1.1 Configure Supabase Email Templates
  - Set up custom email template in Supabase Auth settings using the provided HTML template
  - Configure SMTP settings for reliable email delivery
  - Test email template rendering with actual OTP tokens
  - _Requirements: 1.1, 1.6_

- [x] 1.2 Enhance OTP Verification Component
  - Modify AuthForm.tsx to improve OTP input validation and user experience
  - Add proper error states for invalid, expired, and failed OTP attempts
  - Implement automatic OTP resend functionality with cooldown timer
  - Add loading states and success feedback for better UX
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 1.3 Add Authentication Error Handling
  - Create comprehensive error handling for all authentication scenarios
  - Implement retry mechanisms with exponential backoff for failed requests
  - Add user-friendly error messages and recovery options
  - Test edge cases like network failures and rate limiting
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 2. Implement Image Upload System
  - Create reusable ImageUpload component with drag-and-drop functionality
  - Integrate Supabase Storage for secure image storage and retrieval
  - Add image validation, compression, and thumbnail generation
  - Update report submission and viewing interfaces to handle images
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.1 Create ImageUpload Component
  - Build reusable ImageUpload component with drag-and-drop interface
  - Implement client-side image validation (file type, size, dimensions)
  - Add image preview functionality with remove/replace options
  - Create progress indicators for upload status
  - _Requirements: 2.1, 2.4, 2.5_

- [x] 2.2 Configure Supabase Storage Integration
  - Set up storage bucket policies for secure image access
  - Implement image upload functions with proper error handling
  - Create image URL generation and retrieval utilities
  - Add automatic image optimization and thumbnail generation
  - _Requirements: 2.2, 2.3, 2.6_

- [x] 2.3 Update Report Submission Interface
  - Integrate ImageUpload component into SubmitReport.tsx
  - Modify form submission to handle image uploads
  - Update database schema to store image URLs array
  - Test complete report submission flow with images
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 2.4 Update Report Viewing Interface
  - Create ImageGallery component for displaying report images
  - Update ReportDetail.tsx to show uploaded images
  - Add lightbox functionality for full-size image viewing
  - Implement lazy loading for better performance
  - _Requirements: 2.3, 2.6_

- [x] 3. Create Worker Assignment Interface
  - Build WorkerAssignment component for admins to assign reports
  - Implement worker filtering by specialty and availability
  - Add automatic status updates when workers are assigned
  - Create worker dashboard to view assigned reports
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3.1 Build Worker Assignment Component
  - Create WorkerAssignment component with worker selection interface
  - Implement worker filtering by specialty matching report category
  - Add worker availability status and current workload display
  - Create assignment confirmation and success feedback
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 3.2 Update Report Detail for Admins
  - Integrate WorkerAssignment component into admin ReportDetail view
  - Add assignment history and current assignee display
  - Implement assignment change functionality with audit trail
  - Test assignment workflow from admin perspective
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 3.3 Create Worker Dashboard
  - Build dedicated dashboard for workers to view assigned reports
  - Implement filtering and sorting for worker's report queue
  - Add quick status update actions from dashboard
  - Create workload indicators and availability toggle
  - _Requirements: 3.6, 3.5_

- [x] 3.4 Update Database Schema for Worker Management
  - Add workload tracking columns to workers table (current_workload, max_workload)
  - Create indexes for efficient worker queries
  - Update RLS policies for worker data access
  - Test worker assignment database operations
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 4. Implement Status Update Workflow
  - Create StatusUpdate component for workers and admins
  - Add status change logging to report_status_history table
  - Implement email notifications for status changes
  - Create status timeline view for report history
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 4.1 Create StatusUpdate Component
  - Build StatusUpdate component with status selection and notes input
  - Implement status transition validation and business rules
  - Add required fields for specific status changes (e.g., resolution notes)
  - Create confirmation dialogs for critical status changes
  - _Requirements: 4.1, 4.4, 4.5_

- [x] 4.2 Implement Status Change Logging
  - Update status change functions to log all changes in history table
  - Add user attribution and timestamp tracking for audit trail
  - Implement status change validation and rollback capabilities
  - Test status history integrity and data consistency
  - _Requirements: 4.2, 4.5_

- [x] 4.3 Add Email Notifications for Status Changes
  - Create Supabase Edge Function for sending status change emails
  - Implement email templates for different status transitions
  - Add notification preferences and opt-out functionality
  - Test email delivery for various status change scenarios
  - _Requirements: 4.3, 4.4_

- [x] 4.4 Create Status Timeline Component
  - Build StatusTimeline component to display report history
  - Add visual indicators for different status types and changes
  - Implement expandable details for each status change entry
  - Integrate timeline into ReportDetail view for all user types
  - _Requirements: 4.6, 4.2_

- [x] 5. Add Real-time Notifications
  - Implement Supabase Realtime subscriptions for live updates
  - Create notification system with browser and in-app notifications
  - Add notification preferences and management interface
  - Test real-time functionality across different user scenarios
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 5.1 Set Up Supabase Realtime Subscriptions
  - Configure Supabase Realtime for reports and notifications tables
  - Implement subscription management with proper cleanup
  - Add connection status monitoring and reconnection logic
  - Test real-time data synchronization across multiple clients
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5.2 Create Notification System
  - Build NotificationProvider context for managing notifications
  - Implement browser notification API integration with permissions
  - Create in-app notification components and toast system
  - Add notification sound and visual indicators
  - _Requirements: 5.4, 5.5, 5.6_

- [x] 5.3 Add Notification Management Interface
  - Create notification preferences page for users
  - Implement notification history and mark-as-read functionality
  - Add notification filtering and search capabilities
  - Create notification settings for different event types
  - _Requirements: 5.5, 5.6_

- [x] 5.4 Integrate Real-time Updates in Components
  - Update Dashboard components to show real-time statistics
  - Add live status updates to ReportDetail views
  - Implement real-time worker assignment notifications
  - Test notification delivery across different user roles
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6. Implement Location Picker with GPS



  - Create LocationPicker component with GPS and map integration
  - Add reverse geocoding for address resolution
  - Update report submission to capture precise location data
  - Enhance map visualization with location markers
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 6.1 Create LocationPicker Component
  - Build LocationPicker with Leaflet map integration
  - Implement GPS location capture with browser geolocation API
  - Add map click functionality for manual location selection
  - Create location search with address autocomplete
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 6.2 Add Reverse Geocoding Service
  - Implement reverse geocoding to convert coordinates to addresses
  - Create address formatting utilities for consistent display
  - Add error handling for geocoding service failures
  - Test geocoding accuracy with various location types
  - _Requirements: 6.6, 6.3_

- [x] 6.3 Update Report Submission with Location
  - Integrate LocationPicker into SubmitReport form
  - Update database schema to store precise location data
  - Add location validation and fallback mechanisms
  - Test location capture across different devices and browsers
  - _Requirements: 6.1, 6.3, 6.5_

- [x] 6.4 Enhance Map Visualization
  - Update ReportsMap component to show precise location markers
  - Add clustering for multiple reports in same area
  - Implement map filtering by report status and category
  - Create interactive popups with report details
  - _Requirements: 6.4, 6.3_

- [x] 7. Build Enhanced Analytics Dashboard
  - Create comprehensive analytics components with charts and metrics
  - Implement data aggregation queries for performance insights
  - Add interactive filtering and date range selection
  - Create export functionality for analytics data
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 7.1 Create Analytics Data Service
  - Build analytics queries for report trends and statistics
  - Implement data aggregation functions for performance metrics
  - Add caching layer for expensive analytics queries
  - Create data transformation utilities for chart consumption
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7.2 Build Analytics Dashboard Components
  - Create interactive charts using Recharts library
  - Implement trend analysis with time-series visualizations
  - Add category distribution and status breakdown charts
  - Create worker performance and workload analytics
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7.3 Add Analytics Filtering Interface
  - Create date range picker for analytics time periods
  - Implement category and status filtering for analytics
  - Add geographic filtering by council or area
  - Create saved filter presets for common analytics views
  - _Requirements: 7.6, 7.1, 7.2_

- [ ] 7.4 Implement Data Export Functionality
  - Create export service for analytics data in multiple formats
  - Add CSV, PDF, and Excel export capabilities
  - Implement scheduled report generation and email delivery
  - Create export templates with municipal branding
  - _Requirements: 7.5, 7.6_

- [ ] 8. Improve Mobile Responsiveness
  - Optimize all components for mobile devices and touch interactions
  - Implement mobile-specific navigation and layout patterns
  - Add mobile camera integration for image capture
  - Test and optimize performance on mobile devices
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 8.1 Optimize Mobile Navigation
  - Create mobile-responsive navigation with hamburger menu
  - Implement touch-friendly button sizes and spacing
  - Add swipe gestures for common actions
  - Optimize layout for portrait and landscape orientations
  - _Requirements: 8.3, 8.4_

- [ ] 8.2 Enhance Mobile Forms
  - Optimize form inputs for mobile keyboards and validation
  - Add mobile-specific input types (tel, email, etc.)
  - Implement auto-focus and tab order for better UX
  - Create mobile-friendly date and time pickers
  - _Requirements: 8.4, 8.1_

- [ ] 8.3 Add Mobile Camera Integration
  - Implement direct camera capture for image uploads
  - Add photo editing capabilities (crop, rotate, filters)
  - Create mobile-optimized image preview and selection
  - Test camera functionality across different mobile browsers
  - _Requirements: 8.2, 8.1_

- [ ] 8.4 Optimize Mobile Performance
  - Implement lazy loading for mobile data consumption
  - Add offline functionality with service worker
  - Optimize bundle size and loading times for mobile
  - Create progressive web app (PWA) capabilities
  - _Requirements: 8.5, 8.6_

- [ ] 9. Implement Bulk Operations for Admins
  - Create bulk selection interface for reports management
  - Add bulk status updates, assignments, and priority changes
  - Implement progress tracking and error handling for bulk operations
  - Create audit logging for all bulk operations
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 9.1 Create Bulk Selection Interface
  - Add checkbox selection to reports table and list views
  - Implement select all/none functionality with filtering
  - Create bulk action toolbar with available operations
  - Add selection count and clear selection options
  - _Requirements: 9.1, 9.2_

- [ ] 9.2 Implement Bulk Operations Service
  - Create bulk update functions for status, assignment, and priority
  - Add transaction handling for data consistency
  - Implement progress tracking and partial failure handling
  - Create rollback capabilities for failed bulk operations
  - _Requirements: 9.2, 9.3, 9.5_

- [ ] 9.3 Add Bulk Operation UI Components
  - Create confirmation dialogs for bulk operations
  - Implement progress indicators and status reporting
  - Add bulk operation history and audit trail viewing
  - Create error reporting and retry mechanisms for failed operations
  - _Requirements: 9.3, 9.4, 9.5_

- [ ] 9.4 Test Bulk Operations
  - Test bulk operations with large datasets
  - Verify notification delivery for bulk changes
  - Test error handling and recovery scenarios
  - Validate audit trail accuracy for bulk operations
  - _Requirements: 9.4, 9.6_

- [ ] 10. Add Data Export and Reporting
  - Create comprehensive data export functionality
  - Implement scheduled report generation and delivery
  - Add custom report builder with filtering and formatting
  - Create municipal branding and professional report templates
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 10.1 Build Data Export Service
  - Create export functions for CSV, PDF, and Excel formats
  - Implement data filtering and date range selection for exports
  - Add background processing for large export operations
  - Create export templates with customizable fields and formatting
  - _Requirements: 10.1, 10.2, 10.6_

- [ ] 10.2 Create Report Builder Interface
  - Build drag-and-drop report builder with field selection
  - Implement custom filtering and sorting options
  - Add chart and visualization options for reports
  - Create report preview functionality before generation
  - _Requirements: 10.3, 10.1, 10.2_

- [ ] 10.3 Implement Scheduled Reporting
  - Create scheduled report configuration interface
  - Add email delivery system for automated reports
  - Implement report caching and incremental updates
  - Create report subscription management for stakeholders
  - _Requirements: 10.4, 10.5_

- [ ] 10.4 Add Professional Report Templates
  - Create municipal-branded PDF templates
  - Implement dynamic content insertion and formatting
  - Add charts, graphs, and statistical summaries to templates
  - Create multiple template options for different report types
  - _Requirements: 10.6, 10.3_