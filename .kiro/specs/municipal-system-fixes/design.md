# Design Document

## Overview

This design addresses the comprehensive fixes and enhancements for the Municipal Complaint Management System. The solution leverages Supabase's full-stack capabilities including PostgreSQL with RLS, real-time subscriptions, storage, edge functions, and authentication to create a robust, scalable municipal platform.

## Architecture

### Backend Architecture (Supabase)
- **Database:** PostgreSQL with Row Level Security (RLS) policies
- **Authentication:** Supabase Auth with email OTP and custom email templates
- **Storage:** Supabase Storage for image uploads with CDN
- **Real-time:** Supabase Realtime for live notifications
- **Edge Functions:** For email notifications, image processing, and external integrations
- **API:** Auto-generated REST API from database schema

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **State Management:** TanStack Query for server state, React hooks for local state
- **UI Components:** shadcn/ui with Radix UI primitives
- **Styling:** Tailwind CSS with custom design tokens
- **Maps:** Leaflet for interactive mapping
- **Real-time:** Supabase client for real-time subscriptions

## Components and Interfaces

### 1. Enhanced Authentication System

#### Email Template Configuration
```typescript
// Supabase Auth Email Template
interface EmailTemplate {
  subject: string;
  body: string; // HTML template with {{ .Token }} placeholder
  template_type: 'magic_link' | 'confirmation' | 'recovery';
}
```

#### OTP Verification Component
```typescript
interface OTPVerificationProps {
  email: string;
  onSuccess: () => void;
  onResend: () => Promise<void>;
  maxAttempts: number;
}
```

### 2. Image Upload System

#### Image Upload Component
```typescript
interface ImageUploadProps {
  maxFiles: number;
  maxSizePerFile: number; // in bytes
  acceptedTypes: string[];
  onUpload: (files: File[]) => Promise<string[]>;
  existingImages?: string[];
}
```

#### Storage Structure
```
reports/
  ├── {report_id}/
  │   ├── original/
  │   │   ├── image1.jpg
  │   │   └── image2.png
  │   └── thumbnails/
  │       ├── image1_thumb.jpg
  │       └── image2_thumb.png
```

### 3. Worker Assignment Interface

#### Assignment Component
```typescript
interface WorkerAssignmentProps {
  reportId: string;
  reportCategory: string;
  currentAssignee?: Worker;
  onAssign: (workerId: string) => Promise<void>;
}

interface Worker {
  id: string;
  full_name: string;
  specialty: string;
  is_available: boolean;
  current_workload: number;
}
```

### 4. Status Update Workflow

#### Status Update Component
```typescript
interface StatusUpdateProps {
  reportId: string;
  currentStatus: ReportStatus;
  userRole: 'admin' | 'worker';
  onStatusUpdate: (status: ReportStatus, notes: string) => Promise<void>;
}

type ReportStatus = 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
```

### 5. Real-time Notification System

#### Notification Service
```typescript
interface NotificationService {
  subscribe: (userId: string, callback: (notification: Notification) => void) => void;
  unsubscribe: (userId: string) => void;
  sendNotification: (notification: NotificationPayload) => Promise<void>;
}

interface Notification {
  id: string;
  type: 'report_status_change' | 'worker_assignment' | 'new_report';
  title: string;
  message: string;
  data: Record<string, any>;
  created_at: string;
}
```

### 6. Location Picker Component

#### GPS and Map Integration
```typescript
interface LocationPickerProps {
  initialLocation?: { lat: number; lng: number };
  onLocationSelect: (location: LocationData) => void;
  enableGPS: boolean;
  enableSearch: boolean;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
}
```

## Data Models

### Enhanced Reports Table
```sql
-- Add image URLs array and location data
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS location_data JSONB;

-- Update location_data structure
-- {
--   "address": "123 Main St",
--   "city": "Mumbai",
--   "state": "Maharashtra",
--   "landmark": "Near City Hospital"
-- }
```

### Notifications Table
```sql
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Worker Availability Tracking
```sql
-- Add workload tracking to workers table
ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS current_workload INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_workload INTEGER DEFAULT 10;
```

## Error Handling

### Authentication Errors
- **OTP Delivery Failure:** Retry mechanism with exponential backoff
- **Invalid OTP:** Clear error messages with resend option
- **Expired OTP:** Automatic cleanup and new OTP generation
- **Rate Limiting:** Implement cooldown periods for OTP requests

### File Upload Errors
- **File Size Exceeded:** Client-side validation with compression options
- **Invalid File Type:** Clear messaging with supported formats
- **Storage Quota:** Graceful degradation with admin notifications
- **Network Failures:** Retry mechanism with progress indicators

### Real-time Connection Errors
- **Connection Loss:** Automatic reconnection with exponential backoff
- **Subscription Failures:** Fallback to polling for critical updates
- **Message Delivery:** Acknowledgment system with retry logic

## Testing Strategy

### Unit Testing
- **Authentication Flow:** Mock Supabase auth responses
- **Image Upload:** Test file validation and upload logic
- **Status Updates:** Verify state transitions and notifications
- **Location Services:** Mock GPS and geocoding APIs

### Integration Testing
- **Database Operations:** Test RLS policies and data integrity
- **Real-time Features:** Verify subscription and notification delivery
- **File Storage:** Test upload, retrieval, and deletion workflows
- **Email Delivery:** Test OTP and notification email sending

### End-to-End Testing
- **User Journeys:** Complete flows from registration to report resolution
- **Cross-browser Testing:** Ensure compatibility across devices
- **Performance Testing:** Load testing for concurrent users
- **Mobile Testing:** Touch interactions and responsive design

## Security Considerations

### Data Protection
- **RLS Policies:** Ensure users can only access authorized data
- **File Upload Security:** Validate file types and scan for malware
- **Input Sanitization:** Prevent XSS and SQL injection attacks
- **API Rate Limiting:** Protect against abuse and DoS attacks

### Authentication Security
- **OTP Security:** Secure generation and transmission
- **Session Management:** Proper token handling and expiration
- **Role-based Access:** Strict permission enforcement
- **Audit Logging:** Track all security-relevant actions

## Performance Optimizations

### Database Optimization
- **Indexing Strategy:** Optimize queries for reports, users, and notifications
- **Connection Pooling:** Efficient database connection management
- **Query Optimization:** Use Supabase's query optimization features
- **Caching Strategy:** Implement Redis caching for frequently accessed data

### Frontend Optimization
- **Code Splitting:** Lazy load components and routes
- **Image Optimization:** Automatic resizing and format conversion
- **Bundle Optimization:** Tree shaking and minification
- **Caching Strategy:** Service worker for offline functionality

### Real-time Optimization
- **Subscription Management:** Efficient channel management
- **Message Batching:** Reduce notification frequency for bulk updates
- **Connection Pooling:** Optimize WebSocket connections
- **Fallback Strategies:** Graceful degradation when real-time fails

## Deployment Strategy

### Supabase Configuration
- **Environment Variables:** Secure configuration management
- **Database Migrations:** Version-controlled schema changes
- **Edge Functions:** Deploy notification and processing functions
- **Storage Policies:** Configure secure file access policies

### Frontend Deployment
- **Build Optimization:** Production-ready builds with Vite
- **CDN Configuration:** Static asset delivery optimization
- **Environment Configuration:** Separate dev/staging/production configs
- **Monitoring Setup:** Error tracking and performance monitoring

## Migration Plan

### Phase 1: Authentication Fixes (Week 1)
1. Configure custom email templates in Supabase
2. Implement enhanced OTP verification flow
3. Add proper error handling and retry mechanisms
4. Test authentication across different scenarios

### Phase 2: Core Features (Week 2-3)
1. Implement image upload system with storage
2. Create worker assignment interface
3. Build status update workflow
4. Add basic real-time notifications

### Phase 3: Enhanced Features (Week 4-5)
1. Implement GPS location picker
2. Build comprehensive analytics dashboard
3. Add mobile responsiveness improvements
4. Create bulk operations interface

### Phase 4: Advanced Features (Week 6)
1. Implement data export functionality
2. Add advanced notification system
3. Performance optimization and testing
4. Documentation and training materials