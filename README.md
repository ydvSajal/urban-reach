
# Urban Reach

Urban Reach is a modern web application designed to streamline urban management, reporting, and worker assignments. Built with React, Vite, Tailwind CSS, and Supabase, it provides tools for citizens and workers to interact, report issues, and manage city operations efficiently.

## 🏗️ System Architecture & Workflow

### Process Flow Architecture

```mermaid
graph TB
    subgraph "🌐 Frontend Layer"
        A[Web Application<br/>React + Vite + TypeScript]
        B[Mobile Responsive UI<br/>TailwindCSS + Shadcn/ui]
        C[Real-time Updates<br/>WebSocket Subscriptions]
    end
    
    subgraph "🔐 Authentication Layer"
        D[User Authentication<br/>OTP via Email]
        E[Role-based Access<br/>Admin/Worker/Citizen]
        F[Session Management<br/>JWT + localStorage]
    end
    
    subgraph "☁️ Backend Services"
        G[Supabase Backend<br/>PostgreSQL + Auth + Storage]
        H[API Gateway<br/>RESTful + Real-time]
        I[File Storage<br/>Image Compression]
    end
    
    subgraph "🗺️ External Services"
        J[OpenStreetMap<br/>Geocoding Service]
        K[Leaflet Maps<br/>Interactive Mapping]
        L[Browser APIs<br/>GPS + Camera + Notifications]
    end
    
    A --> D
    B --> E
    C --> F
    D --> G
    E --> H
    F --> I
    G --> J
    H --> K
    I --> L
```

### User Journey Flowcharts

#### 1. 🔐 Authentication & Onboarding Flow

```mermaid
flowchart TD
    START([User Visits Platform]) --> ROLE{Select User Role}
    
    ROLE -->|Admin| ADMIN[Admin Portal<br/>@bennett.edu.in required]
    ROLE -->|Worker| WORKER[Worker Portal<br/>+ Worker Details]
    ROLE -->|Citizen| CITIZEN[Citizen Portal<br/>Standard Registration]
    
    ADMIN --> EMAIL[Enter Email Address]
    WORKER --> EMAIL
    CITIZEN --> EMAIL
    
    EMAIL --> OTP[📧 OTP Sent via Email<br/>Supabase Auth]
    OTP --> VERIFY[Enter 6-digit OTP]
    
    VERIFY --> VALID{OTP Valid?}
    VALID -->|❌ No| ERROR[Show Error + Retry<br/>Max 3 attempts]
    ERROR --> VERIFY
    
    VALID -->|✅ Yes| PROFILE[Create/Update Profile<br/>Set Role & Council ID]
    PROFILE --> DASHBOARD{Route to Dashboard}
    
    DASHBOARD -->|Admin| ADMIN_DASH[📊 Admin Dashboard<br/>Reports + Workers + Analytics]
    DASHBOARD -->|Worker| WORKER_DASH[🔧 Worker Dashboard<br/>Assigned Tasks + Map]
    DASHBOARD -->|Citizen| CITIZEN_DASH[👤 Citizen Dashboard<br/>Submit + Track Reports]
    
    style START fill:#e1f5fe
    style ADMIN_DASH fill:#f3e5f5
    style WORKER_DASH fill:#e8f5e8
    style CITIZEN_DASH fill:#fff3e0
```

#### 2. 📝 Report Submission Flow (Citizen Journey)

```mermaid
flowchart TD
    CITIZEN_DASH[👤 Citizen Dashboard] --> SUBMIT[🆕 Submit New Report]
    
    SUBMIT --> FORM[📝 Report Form]
    
    FORM --> DETAILS[Fill Report Details]
    DETAILS --> TITLE[📋 Issue Title]
    DETAILS --> CATEGORY[🏷️ Category Selection<br/>Roads/Water/Electricity/etc.]
    DETAILS --> DESC[📄 Detailed Description]
    DETAILS --> PRIORITY[⚠️ Priority Level<br/>Low/Medium/High]
    
    FORM --> LOCATION[📍 Location Selection]
    LOCATION --> GPS_OR_MANUAL{GPS or Manual?}
    GPS_OR_MANUAL -->|🛰️ GPS| GPS_DETECT[Auto-detect Location<br/>Browser Geolocation API]
    GPS_OR_MANUAL -->|✏️ Manual| MANUAL_ADDR[Enter Address Manually]
    
    GPS_DETECT --> GEOCODE[🗺️ Geocoding Service<br/>OpenStreetMap Nominatim]
    MANUAL_ADDR --> GEOCODE
    GEOCODE --> ADDR_VALID[✅ Address Validation<br/>& Formatting]
    
    FORM --> IMAGES[📸 Optional Images]
    IMAGES --> UPLOAD[📤 Image Upload<br/>Drag & Drop Interface]
    UPLOAD --> COMPRESS[🗜️ Image Compression<br/>& Validation]
    COMPRESS --> STORAGE[☁️ Supabase Storage]
    
    ADDR_VALID --> VALIDATE[🔍 Form Validation]
    STORAGE --> VALIDATE
    TITLE --> VALIDATE
    CATEGORY --> VALIDATE
    DESC --> VALIDATE
    PRIORITY --> VALIDATE
    
    VALIDATE --> VALID_CHECK{All Fields Valid?}
    VALID_CHECK -->|❌ No| SHOW_ERRORS[❗ Show Validation Errors]
    SHOW_ERRORS --> FORM
    
    VALID_CHECK -->|✅ Yes| SUBMIT_DB[💾 Submit to Database<br/>Create Report Record]
    SUBMIT_DB --> REPORT_NUM[🔢 Generate Report Number<br/>Auto-increment ID]
    REPORT_NUM --> AUTO_ASSIGN[🤖 Auto-assign Worker<br/>Based on Category & Availability]
    
    AUTO_ASSIGN --> NOTIFY[📢 Send Notifications]
    NOTIFY --> CITIZEN_NOTIFY[📧 Notify Citizen<br/>Report Submitted Successfully]
    NOTIFY --> WORKER_NOTIFY[🔔 Notify Assigned Worker<br/>New Task Available]
    NOTIFY --> ADMIN_NOTIFY[📊 Update Admin Dashboard<br/>New Report Counter]
    
    CITIZEN_NOTIFY --> SUCCESS[✅ Success Page<br/>Show Report Number]
    SUCCESS --> TRACK[👀 Track Report Status<br/>Real-time Updates]
    
    style SUBMIT fill:#4caf50
    style SUCCESS fill:#8bc34a
    style NOTIFY fill:#ff9800
```

#### 3. 👨‍💼 Admin Management Flow

```mermaid
flowchart TD
    ADMIN_DASH[📊 Admin Dashboard] --> VIEW_REPORTS[📋 View All Reports]
    
    VIEW_REPORTS --> FILTER[🔍 Filter & Search]
    FILTER --> BY_STATUS[📊 By Status<br/>Pending/In Progress/Resolved]
    FILTER --> BY_CATEGORY[🏷️ By Category<br/>Roads/Water/etc.]
    FILTER --> BY_PRIORITY[⚠️ By Priority Level]
    FILTER --> BY_DATE[📅 By Date Range]
    
    VIEW_REPORTS --> SELECT_REPORT[👆 Select Report]
    SELECT_REPORT --> REPORT_DETAIL[📄 Report Detail View]
    
    REPORT_DETAIL --> VIEW_INFO[👀 View Information]
    VIEW_INFO --> REPORT_DATA[📋 Report Details<br/>Title, Description, Location]
    VIEW_INFO --> IMAGES_GALLERY[🖼️ Images Gallery<br/>Evidence Photos]
    VIEW_INFO --> MAP_LOCATION[🗺️ Location on Map<br/>Interactive Leaflet Map]
    VIEW_INFO --> STATUS_HISTORY[📈 Status Timeline<br/>Complete Audit Trail]
    
    REPORT_DETAIL --> ASSIGNMENT{Current Status?}
    ASSIGNMENT -->|📝 Pending| ASSIGN_WORKER[👷 Assign Worker]
    ASSIGNMENT -->|👤 Assigned| VIEW_WORKER[👀 View Current Worker<br/>Performance & Contact]
    ASSIGNMENT -->|🔄 In Progress| MONITOR[📊 Monitor Progress<br/>Real-time Updates]
    ASSIGNMENT -->|✅ Resolved| REVIEW[📋 Review Resolution<br/>Citizen Feedback]
    
    ASSIGN_WORKER --> WORKER_FILTER[🔍 Filter Available Workers]
    WORKER_FILTER --> BY_SPECIALTY[🛠️ By Specialty Match<br/>Category-specific Skills]
    WORKER_FILTER --> BY_WORKLOAD[📊 By Current Workload<br/>Capacity Management]
    WORKER_FILTER --> BY_PERFORMANCE[⭐ By Performance Rating<br/>Historical Success Rate]
    WORKER_FILTER --> BY_LOCATION[📍 By Proximity<br/>Distance from Issue]
    
    WORKER_FILTER --> SELECT_WORKER[👷 Select Best Worker]
    SELECT_WORKER --> CONFIRM_ASSIGN[✅ Confirm Assignment]
    
    CONFIRM_ASSIGN --> UPDATE_STATUS[🔄 Update Report Status<br/>Pending → Assigned]
    UPDATE_STATUS --> UPDATE_WORKLOAD[📊 Update Worker Workload<br/>Increment Task Counter]
    UPDATE_WORKLOAD --> SEND_NOTIFICATIONS[📢 Send Notifications]
    
    SEND_NOTIFICATIONS --> WORKER_NOTIFICATION[🔔 Notify Worker<br/>New Task Assigned]
    SEND_NOTIFICATIONS --> CITIZEN_NOTIFICATION[📧 Notify Citizen<br/>Worker Assigned to Issue]
    SEND_NOTIFICATIONS --> HISTORY_LOG[📝 Create Status History<br/>Audit Trail Entry]
    
    VIEW_WORKER --> REASSIGN[🔄 Reassign Option]
    REASSIGN --> ASSIGN_WORKER
    
    ADMIN_DASH --> BULK_OPS[⚡ Bulk Operations]
    BULK_OPS --> BULK_SELECT[☑️ Multi-select Reports]
    BULK_SELECT --> BULK_STATUS[🔄 Bulk Status Update]
    BULK_SELECT --> BULK_EXPORT[📤 Bulk Data Export<br/>CSV/Excel Format]
    BULK_SELECT --> BULK_ASSIGN[👥 Bulk Worker Assignment]
    
    ADMIN_DASH --> ANALYTICS[📈 Analytics Dashboard]
    ANALYTICS --> REPORT_STATS[📊 Report Statistics<br/>Trends & Patterns]
    ANALYTICS --> WORKER_PERFORMANCE[⭐ Worker Performance<br/>Metrics & Rankings]
    ANALYTICS --> COUNCIL_INSIGHTS[🏛️ Council-level Insights<br/>Area-wise Analysis]
    
    style ADMIN_DASH fill:#9c27b0
    style ASSIGN_WORKER fill:#2196f3
    style SEND_NOTIFICATIONS fill:#ff9800
    style ANALYTICS fill:#4caf50
```

#### 4. 👷‍♂️ Worker Task Management Flow

```mermaid
flowchart TD
    WORKER_DASH[🔧 Worker Dashboard] --> VIEW_TASKS[📋 View Assigned Tasks]
    
    VIEW_TASKS --> TASK_CATEGORIES[📊 Task Categories]
    TASK_CATEGORIES --> NEW_TASKS[🆕 New Assignments<br/>Recently Assigned]
    TASK_CATEGORIES --> IN_PROGRESS[🔄 In Progress Tasks<br/>Currently Working On]
    TASK_CATEGORIES --> PENDING_REVIEW[⏳ Pending Review<br/>Awaiting Feedback]
    TASK_CATEGORIES --> COMPLETED[✅ Completed Tasks<br/>Successfully Resolved]
    
    VIEW_TASKS --> PERFORMANCE[📈 Performance Metrics]
    PERFORMANCE --> CURRENT_LOAD[📊 Current Workload<br/>Active Tasks Count]
    PERFORMANCE --> COMPLETION_RATE[⭐ Completion Rate<br/>Success Percentage]
    PERFORMANCE --> AVG_TIME[⏱️ Average Completion Time<br/>Efficiency Metric]
    PERFORMANCE --> RATING[🌟 Performance Rating<br/>Overall Score]
    
    VIEW_TASKS --> SELECT_TASK[👆 Select Task]
    SELECT_TASK --> TASK_DETAIL[📄 Task Detail View]
    
    TASK_DETAIL --> VIEW_TASK_INFO[👀 View Task Information]
    VIEW_TASK_INFO --> REPORT_INFO[📋 Report Details<br/>Issue Description & Category]
    VIEW_TASK_INFO --> LOCATION_MAP[🗺️ Location & Directions<br/>GPS Navigation Ready]
    VIEW_TASK_INFO --> EVIDENCE_PHOTOS[📸 Evidence Images<br/>Issue Documentation]
    VIEW_TASK_INFO --> CITIZEN_CONTACT[📞 Citizen Contact Info<br/>Communication Details]
    VIEW_TASK_INFO --> TASK_HISTORY[📈 Task History<br/>Previous Status Updates]
    
    TASK_DETAIL --> UPDATE_STATUS[🔄 Update Task Status]
    UPDATE_STATUS --> STATUS_OPTIONS{Current Status?}
    
    STATUS_OPTIONS -->|📝 Acknowledged| START_WORK[▶️ Start Work<br/>Status: In Progress]
    STATUS_OPTIONS -->|🔄 In Progress| PROGRESS_OPTIONS[🛠️ Progress Options]
    STATUS_OPTIONS -->|Any Status| ADD_NOTES[📝 Add Work Notes<br/>Document Actions Taken]
    
    PROGRESS_OPTIONS --> NEED_INFO[❓ Request Information<br/>Status: Pending Info]
    PROGRESS_OPTIONS --> COMPLETE_TASK[✅ Mark Complete<br/>Status: Resolved]
    PROGRESS_OPTIONS --> CANNOT_FIX[❌ Cannot Fix<br/>Status: Closed]
    PROGRESS_OPTIONS --> ESCALATE[⬆️ Escalate Issue<br/>Status: Escalated]
    
    START_WORK --> RECORD_START[⏰ Record Start Time<br/>Performance Tracking]
    COMPLETE_TASK --> RECORD_COMPLETION[⏱️ Record Completion Time<br/>Calculate Duration]
    CANNOT_FIX --> CLOSURE_REASON[📝 Document Closure Reason<br/>Detailed Explanation]
    ESCALATE --> ESCALATE_ADMIN[📢 Notify Admin<br/>Requires Higher Authority]
    
    ADD_NOTES --> WORK_DESCRIPTION[📋 Describe Actions Taken<br/>Detailed Work Log]
    ADD_NOTES --> PROGRESS_PHOTOS[📸 Add Progress Photos<br/>Before/After Evidence]
    ADD_NOTES --> ISSUE_NOTES[❗ Note Any Issues<br/>Complications or Discoveries]
    
    UPDATE_STATUS --> VALIDATE_INPUT[🔍 Validate Status Update<br/>Check Required Fields]
    VALIDATE_INPUT --> SUBMIT_UPDATE[📤 Submit Status Update]
    
    SUBMIT_UPDATE --> UPDATE_DATABASE[💾 Update Database<br/>Save Status Change]
    UPDATE_DATABASE --> CREATE_HISTORY[📝 Create History Entry<br/>Audit Trail Record]
    CREATE_HISTORY --> UPDATE_METRICS[📊 Update Worker Metrics<br/>Performance Calculation]
    UPDATE_METRICS --> SEND_NOTIFICATIONS[📢 Send Notifications]
    
    SEND_NOTIFICATIONS --> CITIZEN_UPDATE[📧 Notify Citizen<br/>Progress Update]
    SEND_NOTIFICATIONS --> ADMIN_UPDATE[📊 Update Admin Dashboard<br/>Real-time Status]
    SEND_NOTIFICATIONS --> REALTIME_SYNC[🔄 Real-time Sync<br/>Live Dashboard Updates]
    
    TASK_DETAIL --> MAP_INTEGRATION[🗺️ Map Features]
    MAP_INTEGRATION --> VIEW_LOCATION[📍 View Task Location<br/>Interactive Map]
    MAP_INTEGRATION --> GET_DIRECTIONS[🧭 Get Directions<br/>Navigation to Site]
    MAP_INTEGRATION --> REPORT_GPS[📡 Report GPS Issues<br/>Location Problems]
    
    WORKER_DASH --> MOBILE_OPTIMIZED[📱 Mobile Optimizations]
    MOBILE_OPTIMIZED --> CAMERA_CAPTURE[📸 Camera Capture<br/>Quick Photo Upload]
    MOBILE_OPTIMIZED --> OFFLINE_MODE[📶 Offline Mode<br/>Limited Connectivity Support]
    MOBILE_OPTIMIZED --> PUSH_NOTIFICATIONS[🔔 Push Notifications<br/>Real-time Alerts]
    
    style WORKER_DASH fill:#4caf50
    style UPDATE_STATUS fill:#2196f3
    style SEND_NOTIFICATIONS fill:#ff9800
    style COMPLETE_TASK fill:#8bc34a
    style ESCALATE fill:#f44336
```

#### 5. 🔔 Notification & Real-time System Flow

```mermaid
flowchart TD
    TRIGGER[⚡ System Event Triggers] --> EVENT_TYPES[📋 Event Types]
    
    EVENT_TYPES --> STATUS_CHANGE[🔄 Status Change<br/>Report Progress Update]
    EVENT_TYPES --> WORKER_ASSIGNMENT[👷 Worker Assignment<br/>New Task Allocation]
    EVENT_TYPES --> NEW_REPORT[📝 New Report Created<br/>Citizen Submission]
    EVENT_TYPES --> ESCALATION[⬆️ Report Escalation<br/>Issue Requires Attention]
    EVENT_TYPES --> COMPLETION[✅ Task Completion<br/>Work Finished]
    
    STATUS_CHANGE --> NOTIFICATION_ENGINE[🔧 Notification Engine]
    WORKER_ASSIGNMENT --> NOTIFICATION_ENGINE
    NEW_REPORT --> NOTIFICATION_ENGINE
    ESCALATION --> NOTIFICATION_ENGINE
    COMPLETION --> NOTIFICATION_ENGINE
    
    NOTIFICATION_ENGINE --> CHECK_PREFERENCES[⚙️ Check User Preferences<br/>Notification Settings]
    CHECK_PREFERENCES --> USER_PREFS[👤 User Preference Database<br/>Email/Push/In-app Settings]
    
    USER_PREFS --> EMAIL_CHECK{📧 Email Enabled?}
    EMAIL_CHECK -->|✅ Yes| EMAIL_PROCESS[📬 Process Email Notification]
    EMAIL_CHECK -->|❌ No| SKIP_EMAIL[⏭️ Skip Email]
    
    EMAIL_PROCESS --> EMAIL_TEMPLATE[📄 Email Template Processing<br/>Dynamic Content Generation]
    EMAIL_TEMPLATE --> SUPABASE_EMAIL[📧 Supabase Email Function<br/>SMTP Delivery]
    
    USER_PREFS --> PUSH_CHECK{📱 Push Notifications?}
    PUSH_CHECK -->|✅ Yes| PUSH_PROCESS[🔔 Process Push Notification]
    PUSH_CHECK -->|❌ No| SKIP_PUSH[⏭️ Skip Push]
    
    PUSH_PROCESS --> BROWSER_PERMISSION[🔐 Browser Permission Check<br/>Notification API Access]
    BROWSER_PERMISSION --> NATIVE_NOTIFICATION[📲 Show Native Notification<br/>Browser/Mobile Alert]
    
    USER_PREFS --> INAPP_CHECK{📱 In-App Notifications?}
    INAPP_CHECK -->|✅ Yes| INAPP_PROCESS[🔔 Process In-App Notification]
    INAPP_CHECK -->|❌ No| SKIP_INAPP[⏭️ Skip In-App]
    
    INAPP_PROCESS --> CREATE_RECORD[💾 Create Notification Record<br/>Database Storage]
    CREATE_RECORD --> REALTIME_BROADCAST[📡 Supabase Realtime Broadcast<br/>Live WebSocket Update]
    
    REALTIME_BROADCAST --> NOTIFICATION_PROVIDER[🔧 Notification Provider Context<br/>React Global State]
    NOTIFICATION_PROVIDER --> UPDATE_UI[🔄 Update UI Components<br/>Real-time Interface Updates]
    
    UPDATE_UI --> NOTIFICATION_CENTER[🔔 Notification Center<br/>In-App Message List]
    UPDATE_UI --> BADGE_COUNTER[🔴 Notification Badge<br/>Unread Count Display]
    UPDATE_UI --> TOAST_POPUP[🍞 Toast Notifications<br/>Temporary Pop-up Messages]
    
    NOTIFICATION_CENTER --> MARK_READ[👁️ Mark as Read Functionality<br/>User Interaction]
    NOTIFICATION_CENTER --> NOTIFICATION_HISTORY[📜 Notification History<br/>Message Archive]
    
    NOTIFICATION_ENGINE --> REALTIME_DASHBOARD[📊 Real-time Dashboard Updates]
    REALTIME_DASHBOARD --> COUNTER_UPDATES[🔢 Update Counters<br/>Live Statistics]
    REALTIME_DASHBOARD --> LIST_REFRESH[📋 Refresh Lists<br/>Dynamic Content Update]
    REALTIME_DASHBOARD --> STATUS_INDICATORS[🚦 Status Indicators<br/>Visual State Changes]
    REALTIME_DASHBOARD --> WORKER_ASSIGNMENTS[👷 Worker Assignment Display<br/>Live Task Updates]
    
    SUPABASE_EMAIL --> DELIVERY_STATUS[📬 Email Delivery Status<br/>Success/Failure Tracking]
    NATIVE_NOTIFICATION --> USER_INTERACTION[👆 User Interaction<br/>Click/Dismiss Handling]
    MARK_READ --> UPDATE_PREFERENCES[⚙️ Update User Preferences<br/>Learning from User Behavior]
    
    style NOTIFICATION_ENGINE fill:#ff9800
    style REALTIME_BROADCAST fill:#2196f3
    style EMAIL_PROCESS fill:#4caf50
    style PUSH_PROCESS fill:#9c27b0
    style INAPP_PROCESS fill:#00bcd4
```

### 🏗️ Technical Architecture Overview

```mermaid
graph TB
    subgraph "👥 User Layer"
        CITIZENS[👤 Citizens<br/>Report Issues & Track Progress]
        WORKERS[👷 Workers<br/>Handle Tasks & Update Status]
        ADMINS[👨‍💼 Admins<br/>Manage System & Analytics]
    end
    
    subgraph "🌐 Presentation Layer"
        REACT[⚛️ React 18 + TypeScript<br/>Component-based UI]
        ROUTER[🧭 React Router<br/>Client-side Navigation]
        STATE[📊 State Management<br/>React Query + Context API]
        UI[🎨 UI Framework<br/>TailwindCSS + Shadcn/ui]
    end
    
    subgraph "🔧 Business Logic Layer"
        AUTH[🔐 Authentication Logic<br/>OTP + Role-based Access]
        WORKFLOWS[🔄 Workflow Management<br/>Report Lifecycle]
        NOTIFICATIONS[🔔 Notification System<br/>Multi-channel Delivery]
        GEOCODING[🗺️ Location Services<br/>GPS + Address Resolution]
    end
    
    subgraph "🌍 External Services"
        OSM[🗺️ OpenStreetMap<br/>Geocoding + Address Data]
        LEAFLET[🗺️ Leaflet Maps<br/>Interactive Mapping]
        BROWSER[🌐 Browser APIs<br/>GPS + Camera + Notifications]
    end
    
    subgraph "☁️ Backend Services"
        SUPABASE[⚡ Supabase Platform]
        DATABASE[🗃️ PostgreSQL Database<br/>Structured Data + RLS]
        STORAGE[📦 File Storage<br/>Image Management]
        REALTIME[📡 Real-time Engine<br/>WebSocket Subscriptions]
        FUNCTIONS[⚙️ Edge Functions<br/>Email + Automation]
    end
    
    subgraph "📊 Data Layer"
        REPORTS[📋 Reports Table<br/>Issue Management]
        USERS[👥 Users & Profiles<br/>Role Management]
        WORKERS_DB[👷 Workers Table<br/>Skill & Workload Tracking]
        NOTIFICATIONS_DB[🔔 Notifications<br/>Message History]
        HISTORY[📜 Status History<br/>Audit Trail]
    end
    
    CITIZENS --> REACT
    WORKERS --> REACT
    ADMINS --> REACT
    
    REACT --> AUTH
    ROUTER --> WORKFLOWS
    STATE --> NOTIFICATIONS
    UI --> GEOCODING
    
    AUTH --> SUPABASE
    WORKFLOWS --> DATABASE
    NOTIFICATIONS --> REALTIME
    GEOCODING --> OSM
    
    SUPABASE --> REPORTS
    DATABASE --> USERS
    STORAGE --> WORKERS_DB
    REALTIME --> NOTIFICATIONS_DB
    FUNCTIONS --> HISTORY
    
    GEOCODING --> LEAFLET
    NOTIFICATIONS --> BROWSER
    
    style CITIZENS fill:#fff3e0
    style WORKERS fill:#e8f5e8
    style ADMINS fill:#f3e5f5
    style SUPABASE fill:#00d4aa
    style REACT fill:#61dafb
```

## Features
- **🔐 Multi-Role Authentication:** Secure OTP-based login for Citizens, Workers, and Admins
- **📝 Intelligent Report Management:** Submit, track, and manage municipal issues with automatic worker assignment
- **👷 Worker Task System:** Specialized worker dashboards with performance tracking and workload management  
- **🗺️ Advanced Location Services:** GPS integration, interactive maps, and geocoding for precise issue location
- **📱 Real-time Notifications:** Multi-channel notifications (email, push, in-app) with user preferences
- **📊 Analytics & Insights:** Comprehensive dashboards with performance metrics and trend analysis
- **⚡ Bulk Operations:** Efficient data export, bulk status updates, and batch processing
- **📸 Media Management:** Image upload with compression, galleries, and evidence documentation
- **🔄 Live Updates:** Real-time synchronization across all user interfaces using WebSocket technology

## Tech Stack
- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS + Shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Real-time + Functions)
- **Mapping:** Leaflet + OpenStreetMap Nominatim for geocoding
- **State Management:** React Query + Context API
- **Authentication:** Supabase Auth with OTP email verification
- **Real-time:** WebSocket subscriptions for live updates
- **File Handling:** Supabase Storage with image compression
- **Deployment:** Vercel with optimized build configuration

## 🚀 Live Demo
Visit the live application: **[https://urban-reach-1.vercel.app/](https://urban-reach-1.vercel.app/)**

### Test Accounts
- **Citizen Portal:** `/auth/citizen` - Use any email for testing
- **Worker Portal:** `/auth/worker` - Requires worker registration  
- **Admin Portal:** `/auth/admin` - Requires @bennett.edu.in email

## 📁 Project Structure
```
urban-reach/
├── 📁 src/
│   ├── 📁 components/          # Reusable UI components
│   │   ├── ui/                 # Shadcn/ui base components
│   │   ├── AuthForm.tsx        # Authentication interface
│   │   ├── ReportsMap.tsx      # Interactive mapping
│   │   ├── WorkerAssignment.tsx # Worker allocation system
│   │   ├── StatusUpdate.tsx    # Task status management
│   │   ├── NotificationCenter.tsx # Real-time notifications
│   │   └── ImageUpload.tsx     # File upload with compression
│   ├── 📁 pages/               # Application page components
│   │   ├── Dashboard.tsx       # Admin overview
│   │   ├── CitizenDashboard.tsx # Citizen interface
│   │   ├── WorkerDashboard.tsx # Worker task management
│   │   ├── SubmitReport.tsx    # Issue submission form
│   │   └── ReportDetail.tsx    # Detailed report view
│   ├── 📁 hooks/               # Custom React hooks
│   │   ├── useGeocoding.ts     # Location services
│   │   ├── useRealtimeSubscription.ts # Live updates
│   │   └── useNetworkStatus.ts # Connectivity monitoring
│   ├── 📁 lib/                 # Utility libraries
│   │   ├── geocoding.ts        # Address resolution
│   │   ├── notifications.ts    # Message handling
│   │   ├── storage.ts          # File management
│   │   └── error-handling.ts   # Error management
│   └── 📁 integrations/        # External service integrations
│       └── supabase/           # Database & auth configuration
├── 📁 supabase/               # Backend configuration
│   ├── 📁 migrations/         # Database schema evolution
│   ├── 📁 functions/          # Edge functions (email automation)
│   └── config.toml            # Supabase project settings
├── 📁 public/                 # Static assets
└── 📁 docs/                   # Documentation files
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account and project
- Modern web browser with WebSocket support

### Installation Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/ydvSajal/urban-reach.git
   cd urban-reach
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create `.env.local` file with Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Database Setup:**
   Run the included migrations to set up the database schema:
   ```bash
   npx supabase db reset
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open in browser:**
   Navigate to `http://localhost:8080`

## 🗄️ Database Schema

### Core Tables
- **`profiles`** - User information with role-based access control
- **`reports`** - Municipal issue submissions with full lifecycle tracking  
- **`workers`** - Worker profiles with specialization and performance metrics
- **`councils`** - Municipal council management (Bennett University)
- **`notifications`** - Multi-channel notification system with preferences
- **`report_status_history`** - Complete audit trail for all status changes
- **`worker_specialties`** - Skill categorization for optimal task assignment

### Key Features
- **Row Level Security (RLS)** for data protection and privacy
- **Automated triggers** for performance calculation and auto-assignment
- **Real-time subscriptions** for live dashboard updates
- **Comprehensive indexing** for optimal query performance

## 🤝 Contributing

We welcome contributions to Urban Reach! Here's how you can help:

### Development Guidelines
1. **Fork the repository** and create a feature branch
2. **Follow the existing code style** and use TypeScript
3. **Add tests** for new features and ensure existing tests pass
4. **Update documentation** for any API or workflow changes
5. **Submit a pull request** with a clear description of changes

### Code Quality Standards
- ESLint configuration for code consistency
- TypeScript for type safety and better development experience
- Component testing with React Testing Library
- Comprehensive error handling and user feedback

### Areas for Contribution
- 🔧 **Feature Development:** New workflows and user interface improvements
- 🐛 **Bug Fixes:** Issue resolution and performance optimizations  
- 📚 **Documentation:** Guides, tutorials, and API documentation
- 🧪 **Testing:** Unit tests, integration tests, and user acceptance testing
- 🎨 **UI/UX:** Design improvements and accessibility enhancements

## 📚 Documentation

### Additional Resources
- **[Geocoding Service Guide](docs/geocoding-service.md)** - Location services implementation
- **[Supabase Email Setup](docs/supabase-email-template-config.md)** - Email notification configuration
- **[Performance Optimizations](PERFORMANCE_OPTIMIZATIONS.md)** - System optimization strategies
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Detailed feature breakdown

### API References
- [Supabase Documentation](https://supabase.com/docs) - Backend services
- [React Query Guide](https://tanstack.com/query/latest) - Data fetching and caching
- [TailwindCSS](https://tailwindcss.com/docs) - Utility-first styling
- [Leaflet Maps](https://leafletjs.com/) - Interactive mapping

## 🔒 Security & Privacy

- **Row Level Security (RLS)** enforced at database level
- **Role-based access control** with strict permission boundaries
- **Input validation and sanitization** for all user data
- **Secure file upload** with type validation and size limits
- **Environment variable protection** for sensitive credentials

## 📊 Performance Features

- **Code splitting** with lazy-loaded routes for faster initial load
- **Image compression** for optimal storage and bandwidth usage
- **Optimistic updates** for immediate user feedback
- **Real-time synchronization** with minimal data transfer
- **Mobile optimization** with responsive design and touch interfaces

## 🌟 Future Roadmap

- 📱 **Mobile App Development** - Native iOS and Android applications
- 🤖 **AI-Powered Features** - Intelligent issue categorization and priority detection
- 📈 **Advanced Analytics** - Predictive modeling and trend analysis
- 🌍 **Multi-language Support** - Internationalization for broader accessibility  
- 🔗 **Third-party Integrations** - Government databases and mapping services

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 📞 Support & Contact

- **Issues:** [GitHub Issues](https://github.com/ydvSajal/urban-reach/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ydvSajal/urban-reach/discussions)
- **Email:** Contact the development team for enterprise inquiries

---

<div align="center">

**🏙️ Built for Smart Cities | 🚀 Powered by Modern Web Technology | 💡 Open Source Innovation**

*Making urban management more efficient, transparent, and citizen-friendly.*

</div>
