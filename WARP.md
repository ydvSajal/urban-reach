# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview
Urban-reach is a production-ready municipal complaint management system built with React, TypeScript, Supabase, and Tailwind CSS. It enables citizens to submit complaints with images, allows workers to manage assigned tasks, and provides admins with comprehensive oversight tools.

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development environment
npm run build:dev

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Development Server Configuration
- **Port**: 8080 (configured in vite.config.ts)
- **Host**: `::` (accepts connections from any interface)
- **Environment Variables**: Uses `.env` file for Supabase configuration

## Application Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **State Management**: TanStack React Query for server state
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form + Zod validation
- **Maps**: Leaflet + React-Leaflet
- **Charts**: Recharts
- **Notifications**: Sonner + custom notification system

### Role-Based Architecture
The application has three distinct user interfaces:

#### 1. **Citizen Interface** (`CitizenLayout`)
- Routes: `/citizen-dashboard`, `/submit-report`, `/my-reports`, `/reports/:id`, `/notifications`
- Features: Report submission, image upload, status tracking, notifications
- Layout: Mobile-first sidebar navigation

#### 2. **Worker Interface** (`Layout` with worker role)
- Routes: `/worker-dashboard`, `/reports/:id`, `/notifications`
- Features: Task assignment dashboard, status updates, workload tracking
- Specialized for field workers with mobile optimization

#### 3. **Admin Interface** (`Layout` with admin role)
- Routes: `/dashboard`, `/reports`, `/reports/:id`, `/workers`, `/analytics`, `/maps`, `/notifications`
- Features: Complete system oversight, worker management, analytics, bulk operations
- Full desktop experience with comprehensive tools

### Database Schema (Supabase)

#### Core Tables
- **`profiles`**: User profiles with role-based access (citizen/worker/admin)
- **`reports`**: Municipal complaints with images, location, status tracking
- **`workers`**: Worker management with specialty, workload, and performance metrics
- **`councils`**: Municipal council/department organization
- **`notifications`**: In-app notification system with real-time updates

#### Key Features
- **Worker Performance Tracking**: Automatic workload calculation and performance ratings
- **Status History**: Complete audit trail for report status changes
- **Real-time Notifications**: Supabase Realtime for live updates
- **Image Storage**: Supabase Storage with compression and galleries
- **Auto-assignment**: Smart worker assignment based on specialty and workload

### Key Components Architecture

#### Authentication System
- **OTP-based authentication** via Supabase Auth
- Custom email templates configured in Supabase Dashboard
- Role determination after successful authentication
- Automatic profile creation and role assignment

#### Real-time System
- Uses Supabase Realtime for live notifications
- `NotificationProvider` manages real-time subscriptions
- Automatic updates across all user interfaces
- Browser notification support with permission handling

#### Image Upload System
- Drag-and-drop interface with compression
- Supabase Storage integration
- Gallery component for viewing multiple images
- Mobile camera integration support

#### Worker Assignment Logic
- Specialty-based matching using `worker_specialties` table
- Workload balancing with configurable limits
- Performance-based priority assignment
- Automatic assignment functions in database

## File Structure Patterns

### Component Organization
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── Layout.tsx       # Admin/Worker layout
│   ├── CitizenLayout.tsx # Citizen layout
│   └── NotificationProvider.tsx # Real-time notifications
├── pages/               # Route components by role
├── integrations/        # External service integrations
│   └── supabase/       # Supabase client and types
└── hooks/              # Custom React hooks
```

### Important Conventions
- All components use TypeScript with strict typing
- Database types are auto-generated in `src/integrations/supabase/types.ts`
- Custom hooks for data fetching with React Query
- Consistent error handling with toast notifications
- Mobile-first responsive design approach

## Database Development

### Supabase Configuration
- **Project ID**: `zaymnihhizooxnjozibm`
- **Environment**: Production database with Row Level Security (RLS)
- **Auth**: OTP email authentication with custom templates
- **Storage**: Public bucket for report images with automatic optimization

### Migration Files
- Located in `supabase/migrations/`
- Key migrations include worker management enhancements and notifications system
- Use Supabase CLI for database operations: `supabase db push`, `supabase db pull`

### Database Functions
Critical stored functions for application logic:
- `auto_assign_worker(report_id)`: Intelligent worker assignment
- `calculate_worker_performance(worker_id)`: Performance rating calculation
- `get_available_workers_for_category(category)`: Filtered worker availability
- `update_all_worker_performance()`: Batch performance updates

## Development Patterns

### Error Handling
- Comprehensive error boundaries with `ErrorBoundary` component
- Toast notifications for user feedback
- Graceful fallbacks for failed operations
- Network error recovery patterns

### State Management
- Server state via TanStack React Query with optimistic updates
- Local state with React hooks for UI interactions
- Real-time state synchronization via Supabase subscriptions
- Form state with React Hook Form and Zod validation

### Authentication Flow
```typescript
// Role-based routing logic in App.tsx
const [userRole, setUserRole] = useState<string>("");

// Conditional routing based on role
{user && userRole === "admin" && (
  <Route path="/dashboard" element={<Layout userRole={userRole}><Dashboard /></Layout>} />
)}
```

### Real-time Integration
```typescript
// Notification subscription pattern
useEffect(() => {
  const subscription = supabase
    .channel('notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, handleNewNotification)
    .subscribe();
    
  return () => subscription.unsubscribe();
}, []);
```

## Production Considerations

### Environment Setup
1. Configure Supabase environment variables in `.env`
2. Set up custom SMTP for reliable email delivery
3. Configure storage buckets with appropriate policies
4. Set up database backups and monitoring

### Performance Optimizations
- Image compression on upload
- Lazy loading for large datasets
- Query optimization with proper indexes
- Real-time subscription management to prevent memory leaks

### Security Features
- Row Level Security (RLS) on all database tables
- Role-based access control throughout application
- Input validation with Zod schemas
- XSS protection via React's built-in sanitization

## Special Development Notes

### Developer Access
- Email `sajalkumar1765@gmail.com` has special access to all role interfaces
- Use the floating "Dev: Admin View" / "Dev: Citizen View" buttons to switch between interfaces during development

### Mobile Development
- Application is fully mobile-responsive
- Touch-friendly interfaces for field workers
- Camera integration for image capture
- Offline-first considerations for network-limited environments

### Testing Strategy
- Test all three user role interfaces
- Verify real-time notification delivery
- Test image upload and compression
- Validate worker assignment logic
- Check mobile responsiveness across devices

This system is production-ready and actively used for municipal complaint management with robust error handling, comprehensive audit trails, and scalable architecture.
