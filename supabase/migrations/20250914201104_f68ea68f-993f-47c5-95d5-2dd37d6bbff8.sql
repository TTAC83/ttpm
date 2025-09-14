-- BAU Customers Module - Database Schema
-- Forward migration: Create enums, tables, indexes, RLS policies, triggers, views, and RPCs

-- Create enums
CREATE TYPE public.bau_health_enum AS ENUM ('Excellent', 'Good', 'Watch', 'AtRisk');
CREATE TYPE public.ticket_status_enum AS ENUM ('Open', 'InProgress', 'WaitingCustomer', 'Resolved', 'Closed');
CREATE TYPE public.visit_type_enum AS ENUM ('Onsite', 'Remote', 'Review', 'Training');
CREATE TYPE public.change_req_status_enum AS ENUM ('Proposed', 'Approved', 'Rejected', 'Scheduled', 'Completed');

-- Create tables
CREATE TABLE public.bau_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    primary_contact UUID REFERENCES public.profiles(user_id),
    name TEXT NOT NULL,
    site_name TEXT,
    go_live_date DATE,
    health public.bau_health_enum NOT NULL DEFAULT 'Good',
    subscription_plan TEXT,
    sla_response_mins INTEGER,
    sla_resolution_hours INTEGER,
    devices_deployed INTEGER,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bau_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bau_customer_id UUID NOT NULL REFERENCES public.bau_customers(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(user_id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT
);

CREATE TABLE public.bau_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bau_customer_id UUID NOT NULL REFERENCES public.bau_customers(id) ON DELETE CASCADE,
    site_name TEXT NOT NULL,
    address TEXT,
    timezone TEXT
);

CREATE TABLE public.bau_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bau_customer_id UUID NOT NULL REFERENCES public.bau_customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status public.ticket_status_enum NOT NULL DEFAULT 'Open',
    priority INTEGER DEFAULT 3,
    raised_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bau_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bau_customer_id UUID NOT NULL REFERENCES public.bau_customers(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    visit_type public.visit_type_enum NOT NULL DEFAULT 'Onsite',
    attendee UUID REFERENCES auth.users(id),
    summary TEXT,
    next_actions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bau_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bau_customer_id UUID NOT NULL REFERENCES public.bau_customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status public.change_req_status_enum NOT NULL DEFAULT 'Proposed',
    requested_by UUID REFERENCES auth.users(id),
    owner UUID REFERENCES auth.users(id),
    target_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bau_expense_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_assignment_id UUID NOT NULL REFERENCES public.expense_assignments(id) ON DELETE CASCADE,
    bau_customer_id UUID NOT NULL REFERENCES public.bau_customers(id) ON DELETE CASCADE,
    is_billable BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(expense_assignment_id)
);

CREATE TABLE public.bau_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    field TEXT,
    old_value JSONB,
    new_value JSONB,
    actor UUID REFERENCES auth.users(id),
    at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_bau_customers_company ON public.bau_customers(company_id);
CREATE INDEX idx_bau_tickets_baucust_status ON public.bau_tickets(bau_customer_id, status, priority);
CREATE INDEX idx_bau_visits_baucust_date ON public.bau_visits(bau_customer_id, visit_date);
CREATE INDEX idx_bau_chreq_baucust_status ON public.bau_change_requests(bau_customer_id, status);
CREATE INDEX idx_bau_expense_links_baucust ON public.bau_expense_links(bau_customer_id);

-- Enable RLS on all tables
ALTER TABLE public.bau_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bau_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bau_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bau_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bau_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bau_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bau_expense_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bau_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bau_customers
CREATE POLICY "bau_customers_select" ON public.bau_customers
    FOR SELECT 
    USING (is_internal() OR (company_id = user_company_id()));

CREATE POLICY "bau_customers_insert" ON public.bau_customers
    FOR INSERT 
    WITH CHECK (is_internal());

CREATE POLICY "bau_customers_update" ON public.bau_customers
    FOR UPDATE 
    USING (is_internal());

CREATE POLICY "bau_customers_delete" ON public.bau_customers
    FOR DELETE 
    USING (is_internal());

-- RLS Policies for bau_contacts
CREATE POLICY "bau_contacts_select" ON public.bau_contacts
    FOR SELECT 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_contacts.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_contacts_insert" ON public.bau_contacts
    FOR INSERT 
    WITH CHECK (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_contacts.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_contacts_update" ON public.bau_contacts
    FOR UPDATE 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_contacts.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_contacts_delete" ON public.bau_contacts
    FOR DELETE 
    USING (is_internal());

-- RLS Policies for bau_sites
CREATE POLICY "bau_sites_select" ON public.bau_sites
    FOR SELECT 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_sites.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_sites_insert" ON public.bau_sites
    FOR INSERT 
    WITH CHECK (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_sites.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_sites_update" ON public.bau_sites
    FOR UPDATE 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_sites.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_sites_delete" ON public.bau_sites
    FOR DELETE 
    USING (is_internal());

-- RLS Policies for bau_tickets
CREATE POLICY "bau_tickets_select" ON public.bau_tickets
    FOR SELECT 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_tickets.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_tickets_insert" ON public.bau_tickets
    FOR INSERT 
    WITH CHECK (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_tickets.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_tickets_update" ON public.bau_tickets
    FOR UPDATE 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_tickets.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_tickets_delete" ON public.bau_tickets
    FOR DELETE 
    USING (is_internal());

-- RLS Policies for bau_visits
CREATE POLICY "bau_visits_select" ON public.bau_visits
    FOR SELECT 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_visits.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_visits_insert" ON public.bau_visits
    FOR INSERT 
    WITH CHECK (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_visits.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_visits_update" ON public.bau_visits
    FOR UPDATE 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_visits.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_visits_delete" ON public.bau_visits
    FOR DELETE 
    USING (is_internal());

-- RLS Policies for bau_change_requests
CREATE POLICY "bau_change_requests_select" ON public.bau_change_requests
    FOR SELECT 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_change_requests.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_change_requests_insert" ON public.bau_change_requests
    FOR INSERT 
    WITH CHECK (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_change_requests.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_change_requests_update" ON public.bau_change_requests
    FOR UPDATE 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_change_requests.bau_customer_id AND bc.company_id = user_company_id())
    );

CREATE POLICY "bau_change_requests_delete" ON public.bau_change_requests
    FOR DELETE 
    USING (is_internal());

-- RLS Policies for bau_expense_links
CREATE POLICY "bau_expense_links_select" ON public.bau_expense_links
    FOR SELECT 
    USING (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.bau_customers bc WHERE bc.id = bau_expense_links.bau_customer_id AND bc.company_id = user_company_id()) OR
        EXISTS(SELECT 1 FROM public.expense_assignments ea WHERE ea.id = bau_expense_links.expense_assignment_id AND ea.assigned_to_user_id = auth.uid())
    );

CREATE POLICY "bau_expense_links_insert" ON public.bau_expense_links
    FOR INSERT 
    WITH CHECK (
        is_internal() OR 
        EXISTS(SELECT 1 FROM public.expense_assignments ea WHERE ea.id = bau_expense_links.expense_assignment_id AND ea.assigned_to_user_id = auth.uid())
    );

CREATE POLICY "bau_expense_links_update" ON public.bau_expense_links
    FOR UPDATE 
    USING (is_internal());

CREATE POLICY "bau_expense_links_delete" ON public.bau_expense_links
    FOR DELETE 
    USING (is_internal());

-- RLS Policies for bau_audit_logs
CREATE POLICY "bau_audit_logs_select" ON public.bau_audit_logs
    FOR SELECT 
    USING (is_internal());

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.log_bau_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changes JSONB;
    key TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        INSERT INTO public.bau_audit_logs (entity_type, entity_id, field, old_value, new_value, actor)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETED', old_data, NULL, auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
        INSERT INTO public.bau_audit_logs (entity_type, entity_id, field, old_value, new_value, actor)
        VALUES (TG_TABLE_NAME, NEW.id, 'CREATED', NULL, new_data, auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        FOR key IN SELECT jsonb_object_keys(new_data)
        LOOP
            IF old_data->key != new_data->key THEN
                INSERT INTO public.bau_audit_logs (entity_type, entity_id, field, old_value, new_value, actor)
                VALUES (TG_TABLE_NAME, NEW.id, key, old_data->key, new_data->key, auth.uid());
            END IF;
        END LOOP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create audit triggers
CREATE TRIGGER bau_customers_audit AFTER INSERT OR UPDATE OR DELETE ON public.bau_customers
    FOR EACH ROW EXECUTE FUNCTION public.log_bau_changes();

CREATE TRIGGER bau_tickets_audit AFTER INSERT OR UPDATE OR DELETE ON public.bau_tickets
    FOR EACH ROW EXECUTE FUNCTION public.log_bau_changes();

CREATE TRIGGER bau_visits_audit AFTER INSERT OR UPDATE OR DELETE ON public.bau_visits
    FOR EACH ROW EXECUTE FUNCTION public.log_bau_changes();

CREATE TRIGGER bau_change_requests_audit AFTER INSERT OR UPDATE OR DELETE ON public.bau_change_requests
    FOR EACH ROW EXECUTE FUNCTION public.log_bau_changes();

-- Create views
CREATE VIEW public.v_bau_list AS
SELECT 
    bc.id,
    bc.name,
    bc.site_name,
    bc.health,
    bc.subscription_plan,
    bc.devices_deployed,
    bc.go_live_date,
    bc.sla_response_mins,
    bc.sla_resolution_hours,
    c.name as company_name,
    bc.company_id,
    COALESCE(ticket_counts.open_tickets, 0) as open_tickets,
    COALESCE(ticket_counts.total_tickets, 0) as total_tickets,
    bc.created_at
FROM public.bau_customers bc
JOIN public.companies c ON c.id = bc.company_id
LEFT JOIN (
    SELECT 
        bau_customer_id,
        COUNT(*) FILTER (WHERE status IN ('Open', 'InProgress')) as open_tickets,
        COUNT(*) as total_tickets
    FROM public.bau_tickets
    GROUP BY bau_customer_id
) ticket_counts ON ticket_counts.bau_customer_id = bc.id;

CREATE VIEW public.v_bau_projects_like AS
SELECT 
    bc.id as bau_customer_id,
    bc.name,
    bc.site_name,
    c.name as customer_name,
    'bau' as project_type
FROM public.bau_customers bc
JOIN public.companies c ON c.id = bc.company_id;

CREATE VIEW public.v_bau_my_tickets AS
SELECT 
    bt.*,
    bc.name as customer_name,
    bc.site_name,
    p_assigned.name as assigned_to_name,
    p_raised.name as raised_by_name
FROM public.bau_tickets bt
JOIN public.bau_customers bc ON bc.id = bt.bau_customer_id
LEFT JOIN public.profiles p_assigned ON p_assigned.user_id = bt.assigned_to
LEFT JOIN public.profiles p_raised ON p_raised.user_id = bt.raised_by
WHERE bt.assigned_to = auth.uid() OR bt.raised_by = auth.uid();

CREATE VIEW public.v_bau_expenses AS
SELECT 
    e.*,
    ea.status as assignment_status,
    ea.is_billable,
    ea.category,
    ea.assignee_description,
    ea.customer as expense_customer,
    bel.is_billable as bau_billable,
    bc.name as bau_customer_name,
    bc.site_name as bau_site_name,
    c.name as company_name
FROM public.expenses e
JOIN public.expense_assignments ea ON ea.expense_id = e.id
JOIN public.bau_expense_links bel ON bel.expense_assignment_id = ea.id
JOIN public.bau_customers bc ON bc.id = bel.bau_customer_id
JOIN public.companies c ON c.id = bc.company_id;

-- Create RPCs
CREATE OR REPLACE FUNCTION public.bau_create_customer(
    p_company_id UUID,
    p_name TEXT,
    p_site_name TEXT DEFAULT NULL,
    p_plan TEXT DEFAULT NULL,
    p_sla_response_mins INTEGER DEFAULT NULL,
    p_sla_resolution_hours INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    customer_id UUID;
BEGIN
    INSERT INTO public.bau_customers (
        company_id, name, site_name, subscription_plan, 
        sla_response_mins, sla_resolution_hours, created_by
    )
    VALUES (
        p_company_id, p_name, p_site_name, p_plan,
        p_sla_response_mins, p_sla_resolution_hours, auth.uid()
    )
    RETURNING id INTO customer_id;
    
    RETURN customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bau_update_health(
    p_bau_customer_id UUID,
    p_health bau_health_enum
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.bau_customers 
    SET health = p_health 
    WHERE id = p_bau_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bau_create_ticket(
    p_bau_customer_id UUID,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_priority INTEGER DEFAULT 3
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ticket_id UUID;
BEGIN
    INSERT INTO public.bau_tickets (
        bau_customer_id, title, description, priority, raised_by
    )
    VALUES (
        p_bau_customer_id, p_title, p_description, p_priority, auth.uid()
    )
    RETURNING id INTO ticket_id;
    
    RETURN ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bau_update_ticket_status(
    p_ticket_id UUID,
    p_status ticket_status_enum
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.bau_tickets 
    SET status = p_status, updated_at = now()
    WHERE id = p_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bau_log_visit(
    p_bau_customer_id UUID,
    p_visit_date DATE,
    p_visit_type visit_type_enum,
    p_attendee UUID,
    p_summary TEXT DEFAULT NULL,
    p_next_actions TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    visit_id UUID;
BEGIN
    INSERT INTO public.bau_visits (
        bau_customer_id, visit_date, visit_type, attendee, summary, next_actions
    )
    VALUES (
        p_bau_customer_id, p_visit_date, p_visit_type, p_attendee, p_summary, p_next_actions
    )
    RETURNING id INTO visit_id;
    
    RETURN visit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_expense_to_bau(
    p_expense_assignment_id UUID,
    p_bau_customer_id UUID,
    p_is_billable BOOLEAN DEFAULT false
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.bau_expense_links (
        expense_assignment_id, bau_customer_id, is_billable
    )
    VALUES (
        p_expense_assignment_id, p_bau_customer_id, p_is_billable
    )
    ON CONFLICT (expense_assignment_id) DO UPDATE SET
        bau_customer_id = EXCLUDED.bau_customer_id,
        is_billable = EXCLUDED.is_billable;
END;
$$;