ALTER TABLE solutions_projects DISABLE TRIGGER solutions_projects_after_insert;

INSERT INTO solutions_projects (
  company_id, domain, name, site_name, site_address, salesperson, solutions_consultant,
  customer_lead, segment, line_description, product_description, project_goals,
  potential_contract_start_date, created_by
) VALUES (
  'e3f3c364-e305-468f-be84-f416d26855e2', 'Vision', 'Grupo Bimbo', 'Grupo Bimbo',
  'Twenty Business Estate, Units 1-7 Saint Laurence Ave Twenty, Maidstone, ME16 0LL',
  '68034b82-463b-46f2-befb-df6824737e17', 'e526fa27-96f2-4e2b-a538-b234eced2056',
  'a27c65c6-e881-4a08-8a4b-8a25701d8fb6', 'Enterprise',
  '2 x Bakery packing lines.  - Line 1 (Unit 1) - Croissants, Line 3 (Unit 3)- Pan au Chocolat',
  'Line 1 (Unit 1) - Croissants, Line 3 (Unit 3)- Pan au Chocolat -Supplying to retailers - Pressure from Sainsburys to have label validation in place.
Line 1 has roughly 15 SKUS and Line 3 has roughly 15-20 SKUs',
  'Prevent non conforming product from leaving production or supplying to retail customers.  Driven by Sainsburys mandate.',
  '2026-03-01', '68034b82-463b-46f2-befb-df6824737e17'
);

ALTER TABLE solutions_projects ENABLE TRIGGER solutions_projects_after_insert;