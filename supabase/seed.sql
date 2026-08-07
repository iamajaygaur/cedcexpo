-- Phase 3 seed — sample Spring 2027 expo with 5 color groups.
-- Safe for local/dev. Does NOT insert auth.users (create those in Phase 4).
-- Fixed UUIDs keep references stable across resets.

BEGIN;

-- Wipe seedable public data (order respects FKs). Safe on empty DB.
TRUNCATE TABLE
  public.evaluation_scores,
  public.evaluations,
  public.criterion_abet_outcomes,
  public.evaluation_criteria,
  public.judging_assignments,
  public.judge_group_members,
  public.judge_groups,
  public.team_members,
  public.teams,
  public.judges,
  public.events
RESTART IDENTITY CASCADE;

-- Keep profiles (linked to auth). Judges re-seeded only when profiles exist.

INSERT INTO public.events (
  id, name, semester, event_date, location, status, support_email
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Spring 2027 Senior Design Expo',
  'Spring 2027',
  '2027-04-24',
  'CU Denver — Tivoli Turnhalle',
  'active',
  'engineering@ucdenver.edu'
);

-- Color groups (data-driven color_key → app groupColorTokens)
INSERT INTO public.judge_groups (id, event_id, name, color_key, display_order) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Red Group', 'red', 1),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Blue Group', 'blue', 2),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Green Group', 'green', 3),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'Yellow Group', 'yellow', 4),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111111', 'Orange Group', 'orange', 5);

-- Evaluation criteria (Stitch-aligned 5 × max 10)
INSERT INTO public.evaluation_criteria (
  id, event_id, name, description, category, max_score, weight, display_order, active
) VALUES
  (
    '33333333-3333-3333-3333-333333333301',
    '11111111-1111-1111-1111-111111111111',
    'Design Execution',
    'Excellence of design execution: concept, ingenuity, creativity, technical knowledge and engineering merit.',
    'rubric',
    10,
    1,
    1,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    '11111111-1111-1111-1111-111111111111',
    'Professionalism',
    'Professionalism, appearance, attitude and deportment.',
    'rubric',
    10,
    1,
    2,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    '11111111-1111-1111-1111-111111111111',
    'Presentation Quality',
    'Clarity and understandability of oral and visual presentation.',
    'rubric',
    10,
    1,
    3,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    '11111111-1111-1111-1111-111111111111',
    'Teamwork',
    'Evidence of effective collaboration and shared ownership of the work.',
    'rubric',
    10,
    1,
    4,
    TRUE
  ),
  (
    '33333333-3333-3333-3333-333333333305',
    '11111111-1111-1111-1111-111111111111',
    'Project Impact',
    'Impact of project in global, economic, environmental and societal context.',
    'rubric',
    10,
    1,
    5,
    TRUE
  );

INSERT INTO public.criterion_abet_outcomes (criterion_id, outcome_code, outcome_label) VALUES
  ('33333333-3333-3333-3333-333333333301', '1', 'ABET Outcome 1'),
  ('33333333-3333-3333-3333-333333333301', '2', 'ABET Outcome 2'),
  ('33333333-3333-3333-3333-333333333301', '3', 'ABET Outcome 3'),
  ('33333333-3333-3333-3333-333333333302', '4', 'ABET Outcome 4'),
  ('33333333-3333-3333-3333-333333333302', '5', 'ABET Outcome 5'),
  ('33333333-3333-3333-3333-333333333303', '4', 'ABET Outcome 4'),
  ('33333333-3333-3333-3333-333333333303', '5', 'ABET Outcome 5'),
  ('33333333-3333-3333-3333-333333333304', '2', 'ABET Outcome 2'),
  ('33333333-3333-3333-3333-333333333304', '5', 'ABET Outcome 5'),
  ('33333333-3333-3333-3333-333333333304', '7', 'ABET Outcome 7'),
  ('33333333-3333-3333-3333-333333333305', '2', 'ABET Outcome 2'),
  ('33333333-3333-3333-3333-333333333305', '4', 'ABET Outcome 4'),
  ('33333333-3333-3333-3333-333333333305', '6', 'ABET Outcome 6');

-- Sample teams (opaque qr_identifier values)
INSERT INTO public.teams (
  id, event_id, team_number, project_title, project_description, category, advisor, booth_location, qr_identifier
) VALUES
  (
    '44444444-4444-4444-4444-444444444401',
    '11111111-1111-1111-1111-111111111111',
    '04',
    'AI-Powered Traffic Management',
    'Adaptive signal control using computer vision and edge inference.',
    'CS',
    'Dr. Patel',
    'Table 4',
    'qr_team04_a1b2c3d4e5f67890'
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '11111111-1111-1111-1111-111111111111',
    '08',
    'Smart Prosthetic Interface',
    'EMG-driven prosthetic control with haptic feedback.',
    'BME',
    'Dr. Nguyen',
    'Table 8',
    'qr_team08_b2c3d4e5f6789012'
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    '11111111-1111-1111-1111-111111111111',
    '11',
    'Autonomous Drone Pollination',
    'Lightweight UAV for targeted greenhouse pollination.',
    'ME',
    'Prof. Alvarez',
    'Table 11',
    'qr_team11_c3d4e5f678901234'
  ),
  (
    '44444444-4444-4444-4444-444444444404',
    '11111111-1111-1111-1111-111111111111',
    '15',
    'Urban Canopy AI',
    'Heat-island mitigation planning with remote sensing.',
    'CE/CEM',
    'Dr. Kim',
    'Table 15',
    'qr_team15_d4e5f67890123456'
  ),
  (
    '44444444-4444-4444-4444-444444444405',
    '11111111-1111-1111-1111-111111111111',
    '22',
    'Smart Grid Controller',
    'Distributed energy resource coordination for microgrids.',
    'EE',
    'Dr. Torres',
    'Table 22',
    'qr_team22_e5f6789012345678'
  );

INSERT INTO public.team_members (team_id, student_name, student_email) VALUES
  ('44444444-4444-4444-4444-444444444401', 'Alex Rivera', 'alex.rivera@ucdenver.edu'),
  ('44444444-4444-4444-4444-444444444401', 'Jordan Lee', 'jordan.lee@ucdenver.edu'),
  ('44444444-4444-4444-4444-444444444402', 'Sam Okonkwo', 'sam.okonkwo@ucdenver.edu'),
  ('44444444-4444-4444-4444-444444444402', 'Riley Chen', 'riley.chen@ucdenver.edu'),
  ('44444444-4444-4444-4444-444444444403', 'Morgan Diaz', 'morgan.diaz@ucdenver.edu'),
  ('44444444-4444-4444-4444-444444444404', 'Casey Brooks', 'casey.brooks@ucdenver.edu'),
  ('44444444-4444-4444-4444-444444444405', 'Taylor Nguyen', 'taylor.nguyen@ucdenver.edu');

-- Group → team assignments (core judging model)
INSERT INTO public.judging_assignments (id, event_id, group_id, team_id) VALUES
  (
    '55555555-5555-5555-5555-555555555501',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222201', -- Red
    '44444444-4444-4444-4444-444444444401'  -- Team 04
  ),
  (
    '55555555-5555-5555-5555-555555555502',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222201', -- Red
    '44444444-4444-4444-4444-444444444403'  -- Team 11
  ),
  (
    '55555555-5555-5555-5555-555555555503',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222202', -- Blue
    '44444444-4444-4444-4444-444444444404'  -- Team 15
  ),
  (
    '55555555-5555-5555-5555-555555555504',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222203', -- Green
    '44444444-4444-4444-4444-444444444402'  -- Team 08
  ),
  (
    '55555555-5555-5555-5555-555555555505',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222205', -- Orange
    '44444444-4444-4444-4444-444444444405'  -- Team 22
  );

-- Optional: if Phase 4 creates auth users + profiles with these emails,
-- admins can attach judge rows and group memberships manually.
-- Example (commented — requires matching profiles.id):
-- INSERT INTO public.judges (profile_id, organization, title, department, active)
-- VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CU Denver', 'Industry Judge', 'Computer Science', TRUE);

COMMIT;
