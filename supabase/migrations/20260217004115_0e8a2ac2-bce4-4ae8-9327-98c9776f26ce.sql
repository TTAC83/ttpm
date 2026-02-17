
-- IoT device -> Receiver assignment (many devices per receiver)
CREATE TABLE public.device_receiver_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iot_device_id uuid NOT NULL REFERENCES public.iot_devices(id) ON DELETE CASCADE,
  receiver_requirement_id uuid NOT NULL REFERENCES public.project_iot_requirements(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_receiver_assignments_device_key UNIQUE (iot_device_id)
);

ALTER TABLE public.device_receiver_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view device receiver assignments"
  ON public.device_receiver_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert device receiver assignments"
  ON public.device_receiver_assignments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete device receiver assignments"
  ON public.device_receiver_assignments FOR DELETE USING (auth.role() = 'authenticated');

CREATE INDEX idx_device_receiver_assignments_receiver ON public.device_receiver_assignments(receiver_requirement_id);

-- Receiver -> Gateway assignment (many receivers per gateway)
CREATE TABLE public.receiver_gateway_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receiver_requirement_id uuid NOT NULL REFERENCES public.project_iot_requirements(id) ON DELETE CASCADE,
  gateway_requirement_id uuid NOT NULL REFERENCES public.project_iot_requirements(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receiver_gateway_assignments_receiver_key UNIQUE (receiver_requirement_id)
);

ALTER TABLE public.receiver_gateway_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view receiver gateway assignments"
  ON public.receiver_gateway_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert receiver gateway assignments"
  ON public.receiver_gateway_assignments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete receiver gateway assignments"
  ON public.receiver_gateway_assignments FOR DELETE USING (auth.role() = 'authenticated');

CREATE INDEX idx_receiver_gateway_assignments_gateway ON public.receiver_gateway_assignments(gateway_requirement_id);
