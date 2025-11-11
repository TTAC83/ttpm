# Database Entity Relationship Diagram

This document contains the Entity Relationship Diagram (ERD) for the ThingTrax project management database.

## How to View

You can view this diagram using:
- **Online**: Copy the code below and paste it into [mermaid.live](https://mermaid.live) to view and export as PNG/SVG/PDF
- **VS Code**: Install the "Markdown Preview Mermaid Support" extension
- **GitHub**: GitHub automatically renders Mermaid diagrams in markdown files

## Database Schema ERD

```mermaid
erDiagram
    %% Core Entities
    companies ||--o{ projects : "has implementation"
    companies ||--o{ solutions_projects : "has solutions"
    companies ||--o{ bau_customers : "has BAU"
    companies {
        uuid id PK
        text name
        text site_name
        boolean is_internal
        timestamptz created_at
    }

    %% User & Profile
    profiles ||--o{ user_roles : "has"
    profiles }o--|| companies : "belongs to"
    profiles {
        uuid user_id PK
        uuid company_id FK
        text name
        text email
        text role
        boolean is_internal
        text avatar_url
    }

    user_roles {
        uuid id PK
        uuid user_id FK
        app_role role
    }

    %% Implementation Projects
    projects ||--o{ lines : "contains"
    projects ||--o{ project_tasks : "has"
    projects ||--o{ project_events : "has"
    projects ||--o{ impl_blockers : "has"
    projects ||--o{ product_gaps : "has"
    projects ||--o{ vision_models : "has"
    projects ||--o{ expense_assignments : "linked to"
    projects }o--|| companies : "belongs to"
    projects {
        uuid id PK
        uuid company_id FK
        text name
        project_domain domain
        date contract_signed_date
        date planned_go_live_date
        uuid implementation_lead FK
        uuid customer_project_lead FK
        uuid ai_iot_engineer FK
    }

    %% Solutions Projects
    solutions_projects ||--o{ solutions_lines : "contains"
    solutions_projects ||--o{ project_tasks : "has"
    solutions_projects ||--o{ project_events : "has"
    solutions_projects ||--o{ product_gaps : "has"
    solutions_projects ||--o{ vision_models : "has"
    solutions_projects }o--|| companies : "belongs to"
    solutions_projects {
        uuid id PK
        uuid company_id FK
        text name
        date potential_contract_start_date
        uuid salesperson FK
        uuid solutions_consultant FK
    }

    %% Line Builder - Implementation
    lines ||--o{ equipment : "contains"
    lines {
        uuid id PK
        uuid project_id FK
        text name
        text description
        jsonb process_flow
    }

    %% Line Builder - Solutions
    solutions_lines ||--o{ equipment : "contains"
    solutions_lines {
        uuid id PK
        uuid solutions_project_id FK
        text name
        text description
        jsonb process_flow
    }

    %% Equipment (shared between impl and solutions)
    equipment ||--o{ equipment_titles : "has title"
    equipment ||--o{ cameras : "has cameras"
    equipment {
        uuid id PK
        uuid line_id FK
        uuid solutions_line_id FK
        text equipment_type
        text station_id
        integer order_index
    }

    equipment_titles {
        uuid id PK
        uuid equipment_id FK
        text title
        text equipment_type
    }

    %% Cameras
    cameras ||--|| camera_measurements : "has"
    cameras ||--o{ camera_plc_outputs : "has"
    cameras ||--o{ camera_attributes : "has"
    cameras ||--o{ camera_use_cases : "has"
    cameras ||--o{ camera_views : "has"
    cameras }o--|| equipment : "attached to"
    cameras {
        uuid id PK
        uuid equipment_id FK
        text mac_address
        text camera_type
        text lens_type
        boolean light_required
        uuid light_id FK
    }

    camera_measurements {
        uuid camera_id PK_FK
        numeric working_distance
        numeric horizontal_fov
        text smallest_text
    }

    camera_plc_outputs {
        uuid id PK
        uuid camera_id FK
        integer output_number
        text type
        text custom_name
    }

    camera_attributes {
        uuid id PK
        uuid camera_id FK
        text title
        text description
        integer order_index
    }

    camera_use_cases {
        uuid id PK
        uuid camera_id FK
        uuid vision_use_case_id FK
        text description
    }

    camera_views {
        uuid id PK
        uuid camera_id FK
        text product_flow
        text description
    }

    %% Vision Models
    vision_models }o--|| projects : "belongs to implementation"
    vision_models }o--|| solutions_projects : "belongs to solutions"
    vision_models {
        uuid id PK
        uuid project_id FK
        uuid solutions_project_id FK
        text project_type
        uuid line_id FK
        uuid equipment_id FK
        uuid camera_id FK
        text status
        timestamptz product_run_start
        timestamptz product_run_end
        boolean product_run_start_has_time
        boolean product_run_end_has_time
    }

    %% Tasks & Actions
    project_tasks ||--o{ project_actions : "has"
    project_tasks ||--o{ task_subtasks : "has"
    project_tasks }o--|| projects : "belongs to implementation"
    project_tasks }o--|| solutions_projects : "belongs to solutions"
    project_tasks {
        uuid id PK
        uuid project_id FK
        uuid solutions_project_id FK
        uuid master_task_id FK
        text step_name
        text task_title
        date planned_start
        date planned_end
        date actual_start
        date actual_end
        uuid assignee FK
    }

    task_subtasks {
        uuid id PK
        uuid task_id FK
        text title
        boolean completed
        integer order_index
    }

    project_actions }o--|| project_tasks : "belongs to"
    project_actions }o--|| projects : "belongs to implementation"
    project_actions }o--|| solutions_projects : "belongs to solutions"
    project_actions {
        uuid id PK
        uuid project_task_id FK
        uuid project_id FK
        uuid solutions_project_id FK
        text project_type
        text title
        text description
        uuid assignee FK
        date due_date
        boolean completed
    }

    %% Events
    project_events }o--|| projects : "belongs to implementation"
    project_events }o--|| solutions_projects : "belongs to solutions"
    project_events {
        uuid id PK
        uuid project_id FK
        uuid solutions_project_id FK
        text project_type
        text title
        text event_type
        date event_date
    }

    %% Expenses
    expenses ||--o{ expense_assignments : "assigned to"
    expenses {
        uuid id PK
        text description
        numeric amount
        date transaction_date
        text receipt_url
    }

    expense_assignments }o--|| projects : "linked to implementation"
    expense_assignments }o--|| solutions_projects : "linked to solutions"
    expense_assignments {
        uuid id PK
        uuid expense_id FK
        uuid assigned_to_user_id FK
        uuid assigned_to_project_id FK
        uuid assigned_to_solutions_project_id FK
        expense_status status
        expense_category category
        boolean is_billable
    }

    %% BAU Customers
    bau_customers ||--o{ bau_tickets : "has"
    bau_customers ||--o{ bau_visits : "has"
    bau_customers ||--o{ bau_weekly_reviews : "has"
    bau_customers ||--o{ bau_weekly_metrics : "has"
    bau_customers {
        uuid id PK
        uuid company_id FK
        text name
        text site_name
        text subscription_plan
        bau_health_enum health
        integer sla_response_mins
        integer sla_resolution_hours
    }

    bau_tickets {
        uuid id PK
        uuid bau_customer_id FK
        text title
        text description
        ticket_status_enum status
        integer priority
        uuid raised_by FK
    }

    bau_visits {
        uuid id PK
        uuid bau_customer_id FK
        date visit_date
        visit_type_enum visit_type
        uuid attendee FK
        text summary
    }

    bau_weekly_reviews {
        uuid id PK
        uuid bau_customer_id FK
        date date_from
        date date_to
        bau_health_simple health
        churn_risk_level churn_risk
        text escalation
    }

    bau_weekly_metrics {
        uuid id PK
        uuid bau_customer_id FK
        date date_from
        date date_to
        text metric_key
        numeric metric_value_numeric
        text metric_value_text
    }

    %% Implementation Weekly Reviews
    impl_weekly_weeks ||--o{ impl_weekly_reviews : "has"
    impl_weekly_weeks {
        date week_start PK
        date week_end
        timestamptz available_at
    }

    impl_weekly_reviews }o--|| companies : "for company"
    impl_weekly_reviews {
        uuid id PK
        uuid company_id FK
        date week_start FK
        impl_week_status project_status
        impl_health_simple customer_health
        churn_risk_level churn_risk
        text notes
    }

    %% Blockers & Product Gaps
    impl_blockers }o--|| projects : "blocks"
    impl_blockers {
        uuid id PK
        uuid project_id FK
        text title
        text description
        blocker_status status
        text resolution_notes
        timestamptz closed_at
    }

    product_gaps }o--|| projects : "affects implementation"
    product_gaps }o--|| solutions_projects : "affects solutions"
    product_gaps {
        uuid id PK
        uuid project_id FK
        uuid solutions_project_id FK
        text project_type
        text title
        text description
        product_gap_status status
        text resolution_notes
    }

    %% WBS/Gantt
    wbs_layouts {
        uuid id PK
        uuid project_id FK
        uuid solutions_project_id FK
        text step_name
        numeric pos_x
        numeric pos_y
        numeric width
        numeric height
    }

    %% Master Data References
    master_steps ||--o{ master_tasks : "contains"
    master_steps {
        integer id PK
        text name
        integer order_index
    }

    master_tasks ||--o{ project_tasks : "template for"
    master_tasks {
        integer id PK
        integer step_id FK
        text title
        text technology_scope
        text assigned_role
        integer planned_start_offset_days
        integer planned_end_offset_days
    }

    vision_use_cases ||--o{ camera_use_cases : "referenced by"
    vision_use_cases {
        uuid id PK
        text name
        text description
    }

    uk_bank_holidays {
        date date PK
        text title
    }
```

## Key Relationships

### Project Types
- **Implementation Projects**: Full deployment projects tracked in `projects` table
- **Solutions Projects**: Pre-sales/solutions projects tracked in `solutions_projects` table
- Many tables support both project types via dual foreign keys (`project_id` and `solutions_project_id`)

### Line Builder System
- Both implementation and solutions projects can have multiple lines
- Each line contains equipment (stations)
- Equipment can have multiple cameras with detailed configurations
- Cameras link to vision use cases and have measurements, PLC outputs, attributes, and views

### Task Management
- Tasks are templated from `master_tasks` linked to `master_steps`
- Tasks are snapshotted to `project_tasks` when a project is created
- Tasks can have subtasks and actions
- Tasks support both implementation and solutions projects

### Expenses
- Expenses are uploaded and assigned to users
- Can be linked to implementation or solutions projects
- Tracked through approval workflow with status changes

### BAU (Business As Usual)
- Separate customer management for ongoing support customers
- Includes tickets, visits, weekly reviews, and metrics
- Health scoring and churn risk tracking

### Implementation Weekly Reviews
- Structured weekly reporting for implementation projects
- Week-based with standardized periods
- Tracks project status, customer health, and churn risk

## Design Patterns

1. **Dual Project Support**: Many tables have both `project_id` and `solutions_project_id` to support both project types
2. **RLS Security**: All tables use Row Level Security policies
3. **Audit Trails**: Most tables include `created_at`, `updated_at`, `created_by` fields
4. **Template System**: Master data tables provide templates for project-specific data
5. **Flexible Equipment**: Equipment can belong to either implementation or solutions lines
6. **Status Workflows**: Many entities use enum types for consistent status tracking

## Last Updated

2025-11-11
