# Thingtrax Implementation App - Project Overview

This is a comprehensive web application for managing industrial IoT and Vision AI implementation projects. The platform handles project lifecycle management, expense tracking, hardware management, and team collaboration.

## 1. Database Schema

### Core Tables

#### **Companies**
- `id` (uuid, primary key)
- `name` (text, required)
- `is_internal` (boolean, default: false)
- `created_at` (timestamp)
- **Purpose**: Manages customer and internal companies
- **RLS**: Internal users can create companies, users can only see their own company

#### **Profiles**
- `user_id` (uuid, references auth.users)
- `name` (text)
- `company_id` (uuid, references companies)
- `role` (text) - internal_admin, internal_user, external_admin, external_user
- `is_internal` (boolean)
- `job_title`, `phone`, `avatar_url` (text, optional)
- **Purpose**: Extended user information and role management
- **RLS**: Users can only edit their own profile, internal admins can edit all profiles
- **Security**: Phone numbers protected from unauthorized access via secure functions

#### **Projects**
- `id` (uuid, primary key)
- `name` (text, required)
- `company_id` (uuid, references companies)
- `domain` (enum: IoT, Vision, Hybrid)
- `contract_signed_date` (date)
- `site_name`, `site_address` (text)
- Team assignments: `customer_project_lead`, `implementation_lead`, `ai_iot_engineer`, `project_coordinator`, `technical_project_lead` (all uuid references)
- **Purpose**: Main project container
- **RLS**: External users see only their company's projects, internal users see all

#### **Project Members**
- `project_id` (uuid, references projects)
- `user_id` (uuid, references auth.users)
- `role_in_project` (text)
- **Purpose**: Project team membership
- **RLS**: External users see only their company's project members

#### **Project Tasks**
- `id` (uuid, primary key)
- `project_id` (uuid, references projects)
- `master_task_id` (bigint, references master_tasks)
- `task_title`, `task_details` (text)
- `step_name` (text)
- `assignee` (uuid)
- `status` (enum: Planned, In Progress, Completed, On Hold, Cancelled)
- `planned_start`, `planned_end`, `actual_start`, `actual_end` (dates)
- **Purpose**: Individual project tasks with timeline tracking
- **RLS**: External users see only their company's project tasks

#### **Actions**
- `id` (uuid, primary key)
- `project_id` (uuid, optional)
- `project_task_id` (uuid, optional)
- `title`, `details`, `notes` (text)
- `assignee` (uuid)
- `status` (enum: Open, In Progress, Completed, Cancelled)
- `planned_date` (date)
- `is_critical` (boolean)
- **Purpose**: Action items and tasks within projects
- **RLS**: Project members can manage actions in their projects

### Master Data Tables

#### **Master Steps & Tasks**
- `master_steps`: Template project phases (id, name, position)
- `master_tasks`: Template tasks within steps (id, step_id, title, details, technology_scope, assigned_role, planned offsets)
- **Purpose**: Template system for automatic project task creation
- **RLS**: Internal users can read, only internal admins can modify

#### **Hardware Master Data**
- `cameras_master`: Camera specifications and supplier info
- `lens_master`: Lens specifications and supplier info
- `lights`: Lighting equipment data
- `gateways_master`: Network gateway specifications
- `receivers_master`: RF receiver specifications
- `servers_master`: Server hardware specifications
- `plc_master`: PLC (Programmable Logic Controller) data
- **Purpose**: Product catalog for hardware selection
- **RLS**: Internal users only

### Line Builder System

#### **Lines**
- `id` (uuid, primary key)
- `project_id` (uuid, references projects)
- `line_name` (text)
- `iot_device_count`, `camera_count` (integer)
- `min_speed`, `max_speed` (numeric)
- **Purpose**: Production line configurations

#### **Positions**
- `id` (uuid, primary key)
- `line_id` (uuid, references lines)
- `name` (text)
- `position_x`, `position_y` (integer) - coordinates
- `titles` (text array)
- **Purpose**: Specific positions along production lines

#### **Equipment**
- `id` (uuid, primary key)
- `line_id` (uuid, references lines)
- `position_id` (uuid, references positions)
- `name`, `equipment_type` (text)
- `position_x`, `position_y` (integer)
- **Purpose**: Equipment placed at specific line positions

#### **Cameras & IoT Devices**
- `cameras`: Camera installations (equipment_id, camera_type, lens_type, mac_address, light requirements)
- `iot_devices`: IoT sensor installations (equipment_id, name, mac_address, receiver_mac_address)
- **Purpose**: Specific device configurations

### Solutions Projects

#### **Solutions Lines**
- Similar to regular lines but for solutions projects
- `solutions_project_id` (uuid)
- Used for pre-sales and solution design

#### **Solutions Project Hardware**
- `solutions_project_gateways`: Gateway quantities for solutions
- Links solutions projects to hardware master data

### Expense Management

#### **Expenses**
- `id` (uuid, primary key)
- `expense_date` (date)
- `description`, `customer`, `reference`, `invoice_number` (text)
- `net`, `vat`, `gross` (numeric)
- `vat_rate`, `vat_rate_name` (text)
- `account`, `account_code`, `source` (text)
- **Purpose**: Financial expense tracking
- **RLS**: Only authorized users (specific email addresses)

#### **Expense Assignments**
- `id` (uuid, primary key)
- `expense_id` (uuid, references expenses)
- `assigned_to_user_id` (uuid, optional)
- `assigned_to_project_id` (uuid, optional)
- `assigned_to_solutions_project_id` (uuid, optional)
- `assigned_by` (uuid)
- `is_billable` (boolean)
- `assignment_notes` (text)
- **Purpose**: Assign expenses to users/projects
- **RLS**: Same as expenses table

### Event Management

#### **Project Events**
- `id` (uuid, primary key)
- `project_id` (uuid, references projects)
- `title`, `description` (text)
- `start_date`, `end_date` (date)
- `is_critical` (boolean)
- `created_by` (uuid)
- **Purpose**: Project milestones and events

#### **Event Attendees**
- `event_id` (uuid, references project_events)
- `user_id` (uuid)
- **Purpose**: Track event participation

### Supporting Tables

#### **Attachments**
- `id` (uuid, primary key)
- `action_id` (uuid, references actions)
- `file_name`, `file_path`, `mime_type` (text)
- `size_bytes` (integer)
- **Purpose**: File attachments for actions

#### **Equipment/Position Titles**
- `equipment_titles`: Additional titles for equipment
- `position_titles`: Additional titles for positions
- **Purpose**: Extended naming/categorization

#### **Audit Logs**
- `id` (bigint, primary key)
- `entity_type`, `entity_id` (text, uuid)
- `field` (text)
- `old_value`, `new_value` (jsonb)
- `actor` (uuid)
- `at` (timestamp)
- **Purpose**: Change tracking and audit trail
- **RLS**: Internal users only

#### **UK Bank Holidays**
- `date` (date, primary key)
- `name` (text)
- **Purpose**: Working day calculations for project scheduling

## 2. Authentication

### **Enabled Providers**
- **Email/Password**: Primary authentication method
- **Magic Link**: Email-based passwordless login

### **User Roles**
- **internal_admin**: Full system access, can manage all users and data
- **internal_user**: Thingtrax employees, can access all projects
- **external_admin**: Customer administrators, can manage their company's projects
- **external_user**: Customer users, limited access to assigned projects

### **Role Assignment**
- Automatic role assignment based on email domain (@thingtrax.com = internal)
- Manual role assignment by internal admins via admin panel

### **Security Features**
- Row Level Security (RLS) on all tables
- Secure profile data access with field-level restrictions
- Phone number protection from unauthorized access
- Project-based access control

## 3. Storage

### **Storage Buckets**

#### **avatars** (Public)
- **Purpose**: User profile pictures
- **Access**: Public read, users can upload their own avatars
- **Policies**: Users can upload/update their own avatar files

#### **Attachments** (Private)
- **Purpose**: File attachments for project actions
- **Access**: Private, project-member only access
- **Policies**: Project members can upload/access attachments for their projects

## 4. Edge Functions / RPC

### **Database Functions**

#### **User Management**
- `get_all_users_with_profiles()`: Admin function to list all users with profile data
- `admin_set_user_role_and_company()`: Admin function to update user roles and company assignments
- `get_current_user_role()`: Get the current user's role
- `is_current_user_internal()`: Check if current user is internal
- `is_current_user_internal_admin()`: Check if current user is internal admin

#### **Profile Security**
- `get_safe_profile_info()`: Secure function to get limited profile data for project collaboration
- `can_access_profile_field()`: Check field-level access permissions

#### **Project Management**
- `snapshot_project_tasks()`: Create project tasks from master templates
- `projects_after_insert_trigger()`: Automatically create tasks when project is created

#### **Date/Calendar Functions**
- `add_working_days()`: Calculate working days excluding weekends and UK bank holidays
- `is_working_day()`: Check if a date is a working day

#### **Access Control**
- `has_expense_access()`: Check if user can access expense management (specific email addresses only)

#### **Data Validation**
- `actions_validate_and_set_project()`: Ensure action-project relationships are valid

### **Edge Functions**
- `admin-invite-user`: Send invitation emails to new users
- `admin-update-user`: Update user information from admin panel
- `create-action`: Create new actions with validation
- `delete-project`: Safely delete projects and related data
- `update-task`: Update task status and information

## 5. Frontend Usage

### **Main Application Structure**

#### **Authentication Pages**
- `/` - Login page with email/password and magic link options
- `/auth` - Authentication page (redirected from login)
- `/complete-signup` - New user registration completion
- `/reset-password` - Password reset flow

#### **Main Application (`/app`)**
- **Dashboard** (`/app`) - Overview of user's projects and tasks
- **Profile** (`/app/profile`) - User profile management

#### **Project Management**
- **Projects List** (`/app/projects`) - All projects overview
- **New Project** (`/app/projects/new`) - Create new project
- **Project Detail** (`/app/projects/[id]`) - Individual project management with tabs:
  - Overview: Basic project information
  - Tasks: Project task management with Gantt charts
  - Calendar: Project timeline and events
  - Lines: Production line builder
  - Actions: Action items and follow-ups
  - Vision Models: AI model management
  - Audit: Change history
- **Bulk Project Creation** - Mass project creation tools
- **Update Customer Dates** - Specialized date update tools for specific customers

#### **Line Builder System**
- **Line Wizard** - Step-by-step line configuration
- **Line Visualization** - Visual line layout editor
- **Device Assignment** - Assign cameras and IoT devices to positions
- **Equipment Titles** - Manage equipment naming
- **Process Flow Builder** - Configure production flow

#### **Solutions Projects**
- **Solutions List** (`/app/solutions`) - Pre-sales project management
- **New Solutions Project** - Create solution designs
- **Solutions Detail** - Solution project management
- **Solutions Lines** - Line builder for solutions
- **Solutions Hardware** - Hardware selection for solutions

#### **Expense Management**
- **Expenses** (`/app/expenses`) - Main expense interface
- **Unassigned Expenses** - Expenses awaiting assignment
- **Assigned Expenses** - Expenses assigned to projects/users
- **Expense Upload** - Bulk expense import from spreadsheets

#### **Global Views**
- **Global Calendar** (`/app/calendar`) - All project events and milestones
- **Global Tasks** (`/app/tasks`) - All tasks across projects
- **Global Models** (`/app/models`) - AI/Vision model management
- **Actions** (`/app/actions`) - Global action items view

#### **Administration** (Internal Admin Only)
- **User Management** (`/app/admin/users`) - Manage all users and roles
- **Master Data Management** (`/app/admin/master-data`) - Manage project templates
- Hardware master data management:
  - Cameras, Lenses, Lights
  - Gateways, Receivers, PLCs
  - Servers, TV Displays

### **Key User Flows**

1. **Project Creation Flow**:
   - Admin creates new project → System automatically generates tasks from templates → Team members assigned → Tasks appear in individual dashboards

2. **Line Building Flow**:
   - User enters line wizard → Defines basic line info → Builds process flow → Assigns equipment positions → Configures cameras/IoT devices → Line visualization generated

3. **Task Management Flow**:
   - Tasks auto-created from templates → Assigned users receive tasks → Progress tracked in Gantt charts → Actions created for follow-ups → Completion tracked

4. **Expense Processing Flow**:
   - Expenses uploaded from spreadsheets → Appear in unassigned list → Authorized users assign to projects/users → Tracking for billing purposes

## 6. External Integrations

### **File Processing**
- **XLSX Library**: Parse Excel files for bulk expense import
- **Date-fns**: Date manipulation and formatting

### **UI Framework**
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Styling system with custom design tokens
- **Lucide React**: Icon library

### **Charts and Visualization**
- **Recharts**: Data visualization for project analytics

### **Development Tools**
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **React Query**: Data fetching and caching

## 7. Known Issues / TODOs

### **Security Considerations**
- Profile data protection implemented to prevent customer contact information exposure
- Phone numbers and sensitive fields restricted via secure database functions
- Audit trail available for security monitoring

### **Current Limitations**
- Expense access limited to specific email addresses (hardcoded)
- Some customer-specific date update utilities (should be generalized)
- Master data management requires internal admin access

### **Development Notes**
- UK timezone and date formatting throughout
- Working day calculations exclude UK bank holidays
- Invite-only user access (no public registration)
- Role-based access control enforced at database level

### **Performance Considerations**
- Large projects may have many auto-generated tasks
- File upload size limits not explicitly configured
- Database queries optimized with appropriate indexes

## 8. BAU (Business-as-Usual) Customer Management

### **BAU Database Schema**

#### **Core BAU Tables**
- `bau_customers`: Main BAU customer records with health status, SLA terms, and subscription details
- `bau_contacts`: Customer contact information linked to BAU customers
- `bau_sites`: Multiple sites per BAU customer with timezone and location data
- `bau_tickets`: Support ticket system with status tracking and priority management
- `bau_visits`: Visit logs for onsite/remote customer interactions
- `bau_change_requests`: Change request management with approval workflow
- `bau_expense_links`: Links expenses to BAU customers for billing attribution
- `bau_audit_logs`: Complete audit trail for all BAU-related changes

#### **BAU Enums**
- `bau_health_enum`: {Excellent, Good, Watch, AtRisk}
- `ticket_status_enum`: {Open, InProgress, WaitingCustomer, Resolved, Closed}
- `visit_type_enum`: {Onsite, Remote, Review, Training}
- `change_req_status_enum`: {Proposed, Approved, Rejected, Scheduled, Completed}

### **BAU Navigation & Permissions**
- **Internal users**: Full BAU module access, can create/edit all BAU records
- **External users**: Can only access BAU records for their company
- **BAU nav item**: Visible only to users with accessible BAU records

### **BAU Routes**
- `/app/bau` - BAU customers list with health status and ticket counts
- `/app/bau/new` - Create new BAU customer (internal only)
- `/app/bau/[id]` - BAU customer detail with tabs:
  - Overview: KPIs, health status, customer information
  - Tickets: Support ticket management
  - Visits: Visit scheduling and logging
  - Changes: Change request workflow
  - Contacts: Customer contact management
  - Expenses: Linked expenses with billable status
  - Audit: Complete change history
- `/app/bau/my-tickets` - Personal ticket dashboard

### **Expense Attribution Options**
1. **No Assignment**: General expense not tied to specific project/customer
2. **Assign to Project**: Link to implementation or solutions project
3. **Assign to BAU Customer**: Link to ongoing customer support (new option)

**BAU Expense Flow**:
- User selects "Assign to BAU Customer" during expense confirmation
- Searchable table shows available BAU customers with health status
- On selection, expense routes directly to ReadyForSignoff (no project lead review)
- BAU-linked expenses appear in customer's expense tab for billing

### **BAU Lifecycle Management**
- **Ticket Lifecycle**: Open → InProgress → (WaitingCustomer) → Resolved → Closed
- **Visit Types**: Onsite maintenance, Remote support, Regular reviews, Training sessions
- **Change Requests**: Customer-requested changes with approval workflow
- **Health Monitoring**: Track customer health (Excellent → Good → Watch → AtRisk)

## 9. Deployment & Configuration

### **Environment Variables**
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_SITE_URL`: Application URL for redirects

### **Supabase Configuration**
- Project ID: `tjbiyyejofdpwybppxhv`
- Authentication URLs configured for production and development
- Edge functions deployed automatically
- Row Level Security enabled on all tables

This project represents a comprehensive project management platform specifically designed for industrial IoT and Vision AI implementations, with robust security, role-based access, and extensive hardware management capabilities.