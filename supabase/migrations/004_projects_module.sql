-- ============================================================
-- NexusOS - Migration 004: Projects Module
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE project_status AS ENUM (
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

CREATE TYPE priority_level AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE project_member_role AS ENUM (
  'owner',
  'member',
  'viewer'
);

CREATE TYPE sprint_status AS ENUM (
  'planning',
  'active',
  'review',
  'closed'
);

CREATE TYPE okr_type AS ENUM (
  'objective',
  'key_result'
);

CREATE TYPE dependency_type AS ENUM (
  'finish_to_start',
  'start_to_start'
);

-- ============================================================
-- TABLE: projects
-- ============================================================

CREATE TABLE projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  status      project_status NOT NULL DEFAULT 'planning',
  priority    priority_level NOT NULL DEFAULT 'medium',
  start_date  date,
  end_date    date,
  budget      numeric(14, 2),
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_projects_org_id ON projects(org_id);

-- ============================================================
-- TABLE: project_members
-- ============================================================

CREATE TABLE project_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        project_member_role NOT NULL DEFAULT 'member',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- ============================================================
-- TABLE: boards
-- ============================================================

CREATE TABLE boards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_boards_project_id ON boards(project_id);
CREATE INDEX idx_boards_org_id ON boards(org_id);

-- ============================================================
-- TABLE: board_columns
-- ============================================================

CREATE TABLE board_columns (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  color      text,
  wip_limit  integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_board_columns_board_id ON board_columns(board_id);

-- ============================================================
-- TABLE: tasks
-- ============================================================

CREATE TABLE tasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id         uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id        uuid NOT NULL REFERENCES board_columns(id),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  priority         priority_level NOT NULL DEFAULT 'medium',
  status           text NOT NULL DEFAULT 'todo',
  assignee_id      uuid REFERENCES auth.users(id),
  reporter_id      uuid REFERENCES auth.users(id),
  parent_task_id   uuid REFERENCES tasks(id) ON DELETE SET NULL,
  position         integer NOT NULL DEFAULT 0,
  estimated_hours  numeric(6, 2),
  story_points     integer,
  labels           text[] DEFAULT '{}',
  due_date         date,
  attachments      jsonb DEFAULT '[]',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_tasks_org_id ON tasks(org_id);
CREATE INDEX idx_tasks_board_id ON tasks(board_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);

-- ============================================================
-- TABLE: task_comments
-- ============================================================

CREATE TABLE task_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  content     text NOT NULL,
  attachments jsonb DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);

-- ============================================================
-- TABLE: time_entries
-- ============================================================

CREATE TABLE time_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id),
  description       text,
  started_at        timestamptz NOT NULL,
  ended_at          timestamptz,
  duration_minutes  integer,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_org_id ON time_entries(org_id);

-- ============================================================
-- TABLE: sprints
-- ============================================================

CREATE TABLE sprints (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       text NOT NULL,
  goal       text,
  status     sprint_status NOT NULL DEFAULT 'planning',
  start_date date,
  end_date   date,
  velocity   integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sprints_updated_at
  BEFORE UPDATE ON sprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_sprints_project_id ON sprints(project_id);

-- ============================================================
-- TABLE: sprint_tasks
-- ============================================================

CREATE TABLE sprint_tasks (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  task_id   uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  org_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  added_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sprint_id, task_id)
);

CREATE INDEX idx_sprint_tasks_sprint_id ON sprint_tasks(sprint_id);

-- ============================================================
-- TABLE: okrs
-- ============================================================

CREATE TABLE okrs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES projects(id) ON DELETE SET NULL,
  title        text NOT NULL,
  description  text,
  type         okr_type NOT NULL DEFAULT 'objective',
  parent_id    uuid REFERENCES okrs(id) ON DELETE SET NULL,
  progress     integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  owner_id     uuid REFERENCES auth.users(id),
  period_start date,
  period_end   date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_okrs_updated_at
  BEFORE UPDATE ON okrs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_okrs_org_id ON okrs(org_id);
CREATE INDEX idx_okrs_parent_id ON okrs(parent_id);

-- ============================================================
-- TABLE: task_dependencies
-- ============================================================

CREATE TABLE task_dependencies (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id  uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type     dependency_type NOT NULL DEFAULT 'finish_to_start',
  org_id              uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- All project tables filtered by org_id using is_org_member
CREATE POLICY "projects_org_member" ON projects FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "project_members_org_member" ON project_members FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "boards_org_member" ON boards FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "board_columns_org_member" ON board_columns FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "tasks_org_member" ON tasks FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "task_comments_org_member" ON task_comments FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "time_entries_org_member" ON time_entries FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "sprints_org_member" ON sprints FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "sprint_tasks_org_member" ON sprint_tasks FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "okrs_org_member" ON okrs FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));

CREATE POLICY "task_dependencies_org_member" ON task_dependencies FOR ALL TO authenticated
  USING (is_org_member(org_id)) WITH CHECK (is_org_member(org_id));
