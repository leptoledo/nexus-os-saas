from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.database import get_current_user, get_supabase_admin, get_tenant_id
from app.middleware.rbac import require_min_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["Projects"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: str = "planning"  # planning, active, on_hold, completed, cancelled
    priority: str = "medium"  # low, medium, high, critical
    budget: Optional[float] = None
    members: Optional[List[str]] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    budget: Optional[float] = None


class BoardCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    columns: Optional[List[Dict[str, Any]]] = None  # [{name, color}]


class BoardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TaskCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: Optional[str] = None
    column_id: str  # UUID of board_columns row
    assignee_id: Optional[str] = None
    priority: str = "medium"  # low, medium, high, critical
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    labels: Optional[List[str]] = []
    parent_task_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    labels: Optional[List[str]] = None
    status: Optional[str] = None


class TaskMoveRequest(BaseModel):
    column_id: str  # UUID of target board_columns row
    position: Optional[int] = None


class TimeEntryCreate(BaseModel):
    description: Optional[str] = None
    started_at: str
    ended_at: Optional[str] = None
    duration_minutes: Optional[int] = None


class SprintCreate(BaseModel):
    name: str = Field(..., max_length=200)
    goal: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    velocity: Optional[int] = None


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None


class OKRCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: Optional[str] = None
    type: str = "objective"  # objective or key_result
    parent_id: Optional[str] = None
    progress: Optional[int] = 0  # 0-100
    owner_id: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class OKRUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    progress: Optional[int] = None
    owner_id: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _now() -> str:
    return datetime.utcnow().isoformat()


def _not_found(entity: str = "Resource") -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity} not found")


DEFAULT_COLUMNS = [
    {"name": "Backlog", "position": 0, "color": "#94a3b8"},
    {"name": "To Do", "position": 1, "color": "#60a5fa"},
    {"name": "In Progress", "position": 2, "color": "#fbbf24"},
    {"name": "Review", "position": 3, "color": "#a78bfa"},
    {"name": "Done", "position": 4, "color": "#34d399"},
]


def _create_board_columns(admin, board_id: str, org_id: str, columns: Optional[List[Dict]] = None):
    """Insert board_columns rows for a board. Returns created columns."""
    col_defs = columns or DEFAULT_COLUMNS
    rows = []
    for i, col in enumerate(col_defs):
        rows.append({
            "board_id": board_id,
            "org_id": org_id,
            "name": col.get("name", f"Column {i+1}"),
            "position": col.get("position", i),
            "color": col.get("color"),
            "created_at": _now(),
        })
    result = admin.table("board_columns").insert(rows).execute()
    return result.data or []


def _board_with_columns(admin, board: dict) -> dict:
    """Enrich a board dict with its columns."""
    cols = (
        admin.table("board_columns")
        .select("*")
        .eq("board_id", board["id"])
        .order("position")
        .execute()
    )
    return {**board, "columns": cols.data or []}


# ---------------------------------------------------------------------------
# Project routes
# ---------------------------------------------------------------------------


@router.get("")
async def list_projects(
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[str] = None,
):
    admin = get_supabase_admin()
    offset = (page - 1) * page_size
    query = (
        admin.table("projects")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
    )
    if status_filter:
        query = query.eq("status", status_filter)
    result = query.execute()
    return {"data": result.data or [], "page": page, "page_size": page_size}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    data = {
        **body.model_dump(exclude={"members"}),
        "org_id": org_id,
        "created_by": current_user.user_id,
        "created_at": _now(),
    }
    result = admin.table("projects").insert(data).execute()
    project = result.data[0]

    # Add creator as project owner
    try:
        admin.table("project_members").insert({
            "project_id": project["id"],
            "org_id": org_id,
            "user_id": current_user.user_id,
            "role": "owner",
            "created_at": _now(),
        }).execute()
    except Exception as exc:
        logger.warning("Could not add project owner: %s", exc)

    # Add other invited members
    for member_id in (body.members or []):
        if member_id != current_user.user_id:
            try:
                admin.table("project_members").insert({
                    "project_id": project["id"],
                    "org_id": org_id,
                    "user_id": member_id,
                    "role": "member",
                    "created_at": _now(),
                }).execute()
            except Exception:
                pass

    # Create default board + columns
    try:
        board_result = admin.table("boards").insert({
            "project_id": project["id"],
            "org_id": org_id,
            "name": "Main Board",
            "created_at": _now(),
        }).execute()
        if board_result.data:
            _create_board_columns(admin, board_result.data[0]["id"], org_id)
    except Exception as exc:
        logger.warning("Could not create default board: %s", exc)

    return project


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("org_id", org_id)
        .single()
        .execute()
    )
    if not result.data:
        raise _not_found("Project")
    return result.data


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        admin.table("projects")
        .update(update_data)
        .eq("id", project_id)
        .eq("org_id", org_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Project")
    return result.data[0]


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    admin.table("projects").delete().eq("id", project_id).eq("org_id", org_id).execute()


# ---------------------------------------------------------------------------
# Board routes
# ---------------------------------------------------------------------------


@router.get("/{project_id}/boards")
async def list_boards(
    project_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("boards")
        .select("*")
        .eq("project_id", project_id)
        .eq("org_id", org_id)
        .execute()
    )
    boards = [_board_with_columns(admin, b) for b in (result.data or [])]
    return {"data": boards}


@router.post("/{project_id}/boards", status_code=status.HTTP_201_CREATED)
async def create_board(
    project_id: str,
    body: BoardCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    board_data = {
        "project_id": project_id,
        "org_id": org_id,
        "name": body.name,
        "description": body.description,
        "created_at": _now(),
    }
    result = admin.table("boards").insert(board_data).execute()
    board = result.data[0]
    cols = _create_board_columns(admin, board["id"], org_id, body.columns)
    return {**board, "columns": cols}


@router.get("/{project_id}/boards/{board_id}")
async def get_board(
    project_id: str,
    board_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("boards")
        .select("*")
        .eq("id", board_id)
        .eq("project_id", project_id)
        .single()
        .execute()
    )
    if not result.data:
        raise _not_found("Board")
    return _board_with_columns(admin, result.data)


@router.put("/{project_id}/boards/{board_id}")
async def update_board(
    project_id: str,
    board_id: str,
    body: BoardUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        admin.table("boards")
        .update(update_data)
        .eq("id", board_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Board")
    return _board_with_columns(admin, result.data[0])


@router.delete("/{project_id}/boards/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    project_id: str,
    board_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("boards").delete().eq("id", board_id).eq("project_id", project_id).execute()


# ---------------------------------------------------------------------------
# Task routes
# ---------------------------------------------------------------------------


@router.get("/{project_id}/boards/{board_id}/tasks")
async def list_tasks(
    project_id: str,
    board_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    column_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    sprint_id: Optional[str] = None,
):
    admin = get_supabase_admin()

    # If filtering by sprint, get task IDs from sprint_tasks junction
    task_ids = None
    if sprint_id:
        st = (
            admin.table("sprint_tasks")
            .select("task_id")
            .eq("sprint_id", sprint_id)
            .eq("org_id", org_id)
            .execute()
        )
        task_ids = [r["task_id"] for r in (st.data or [])]
        if not task_ids:
            return {"data": []}

    query = (
        admin.table("tasks")
        .select("*")
        .eq("board_id", board_id)
        .eq("project_id", project_id)
        .order("position")
    )
    if column_id:
        query = query.eq("column_id", column_id)
    if assignee_id:
        query = query.eq("assignee_id", assignee_id)
    if task_ids is not None:
        query = query.in_("id", task_ids)
    result = query.execute()
    return {"data": result.data or []}


@router.post("/{project_id}/boards/{board_id}/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: str,
    board_id: str,
    body: TaskCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    # Determine position (append to column)
    existing = (
        admin.table("tasks")
        .select("id")
        .eq("board_id", board_id)
        .eq("column_id", body.column_id)
        .execute()
    )
    position = len(existing.data or [])

    data = {
        **body.model_dump(),
        "board_id": board_id,
        "project_id": project_id,
        "org_id": org_id,
        "reporter_id": current_user.user_id,
        "position": position,
        "status": "todo",
        "created_at": _now(),
    }
    result = admin.table("tasks").insert(data).execute()
    return result.data[0]


@router.get("/{project_id}/boards/{board_id}/tasks/{task_id}")
async def get_task(
    project_id: str,
    board_id: str,
    task_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("tasks")
        .select("*")
        .eq("id", task_id)
        .eq("board_id", board_id)
        .single()
        .execute()
    )
    if not result.data:
        raise _not_found("Task")
    return result.data


@router.put("/{project_id}/boards/{board_id}/tasks/{task_id}")
async def update_task(
    project_id: str,
    board_id: str,
    task_id: str,
    body: TaskUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        admin.table("tasks")
        .update(update_data)
        .eq("id", task_id)
        .eq("board_id", board_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Task")
    return result.data[0]


@router.delete(
    "/{project_id}/boards/{board_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_task(
    project_id: str,
    board_id: str,
    task_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("tasks").delete().eq("id", task_id).eq("board_id", board_id).execute()


@router.put("/{project_id}/boards/{board_id}/tasks/{task_id}/move")
async def move_task(
    project_id: str,
    board_id: str,
    task_id: str,
    body: TaskMoveRequest,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update: Dict[str, Any] = {"column_id": body.column_id}
    if body.position is not None:
        update["position"] = body.position
    result = (
        admin.table("tasks").update(update).eq("id", task_id).eq("board_id", board_id).execute()
    )
    if not result.data:
        raise _not_found("Task")
    return result.data[0]


@router.post(
    "/{project_id}/boards/{board_id}/tasks/{task_id}/time-entries",
    status_code=status.HTTP_201_CREATED,
)
async def create_time_entry(
    project_id: str,
    board_id: str,
    task_id: str,
    body: TimeEntryCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    data = {
        **body.model_dump(),
        "task_id": task_id,
        "project_id": project_id,
        "org_id": org_id,
        "user_id": current_user.user_id,
        "created_at": _now(),
    }
    result = admin.table("time_entries").insert(data).execute()
    return result.data[0]


# ---------------------------------------------------------------------------
# Sprint routes
# ---------------------------------------------------------------------------


@router.get("/{project_id}/sprints")
async def list_sprints(
    project_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("sprints")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": result.data or []}


@router.post("/{project_id}/sprints", status_code=status.HTTP_201_CREATED)
async def create_sprint(
    project_id: str,
    body: SprintCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    data = {
        **body.model_dump(),
        "project_id": project_id,
        "org_id": org_id,
        "status": "planning",
        "created_at": _now(),
    }
    result = admin.table("sprints").insert(data).execute()
    return result.data[0]


@router.put("/{project_id}/sprints/{sprint_id}")
async def update_sprint(
    project_id: str,
    sprint_id: str,
    body: SprintUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = (
        admin.table("sprints")
        .update(update_data)
        .eq("id", sprint_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Sprint")
    return result.data[0]


@router.delete("/{project_id}/sprints/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sprint(
    project_id: str,
    sprint_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("sprints").delete().eq("id", sprint_id).eq("project_id", project_id).execute()


@router.put("/{project_id}/sprints/{sprint_id}/start")
async def start_sprint(
    project_id: str,
    sprint_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    # Ensure no other sprint is already active
    active = (
        admin.table("sprints")
        .select("id")
        .eq("project_id", project_id)
        .eq("status", "active")
        .execute()
    )
    if active.data:
        raise HTTPException(status_code=400, detail="Another sprint is already active")
    result = (
        admin.table("sprints")
        .update({"status": "active"})
        .eq("id", sprint_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Sprint")
    return result.data[0]


@router.put("/{project_id}/sprints/{sprint_id}/close")
async def close_sprint(
    project_id: str,
    sprint_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()

    # Get tasks in this sprint via junction table
    sprint_task_rows = (
        admin.table("sprint_tasks")
        .select("task_id")
        .eq("sprint_id", sprint_id)
        .eq("org_id", org_id)
        .execute()
    )
    task_ids = [r["task_id"] for r in (sprint_task_rows.data or [])]
    total = len(task_ids)
    completed = 0

    if task_ids:
        tasks_res = (
            admin.table("tasks")
            .select("id, status")
            .in_("id", task_ids)
            .execute()
        )
        completed = len([t for t in (tasks_res.data or []) if t.get("status") == "done"])

    result = (
        admin.table("sprints")
        .update({"status": "closed"})
        .eq("id", sprint_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise _not_found("Sprint")
    return {
        **result.data[0],
        "summary": {"total": total, "completed": completed, "incomplete": total - completed},
    }


@router.post("/{project_id}/sprints/{sprint_id}/tasks")
async def add_task_to_sprint(
    project_id: str,
    sprint_id: str,
    task_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Add a task to a sprint via the sprint_tasks junction table."""
    admin = get_supabase_admin()
    result = admin.table("sprint_tasks").insert({
        "sprint_id": sprint_id,
        "task_id": task_id,
        "org_id": org_id,
        "added_at": _now(),
    }).execute()
    return result.data[0] if result.data else {"message": "Task added to sprint"}


# ---------------------------------------------------------------------------
# OKR routes
# ---------------------------------------------------------------------------


@router.get("/{project_id}/okrs")
async def list_okrs(
    project_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    result = (
        admin.table("okrs")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at")
        .execute()
    )
    return {"data": result.data or []}


@router.post("/{project_id}/okrs", status_code=status.HTTP_201_CREATED)
async def create_okr(
    project_id: str,
    body: OKRCreate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
    _=Depends(require_min_role("manager")),
):
    admin = get_supabase_admin()
    data = {
        **body.model_dump(),
        "project_id": project_id,
        "org_id": org_id,
        "created_at": _now(),
    }
    # Default owner to current user if not set
    if not data.get("owner_id"):
        data["owner_id"] = current_user.user_id
    result = admin.table("okrs").insert(data).execute()
    return result.data[0]


@router.put("/{project_id}/okrs/{okr_id}")
async def update_okr(
    project_id: str,
    okr_id: str,
    body: OKRUpdate,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    # Clamp progress 0-100
    if "progress" in update_data:
        update_data["progress"] = max(0, min(100, int(update_data["progress"])))
    result = (
        admin.table("okrs")
        .update(update_data)
        .eq("id", okr_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise _not_found("OKR")
    return result.data[0]


@router.delete("/{project_id}/okrs/{okr_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_okr(
    project_id: str,
    okr_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    admin = get_supabase_admin()
    admin.table("okrs").delete().eq("id", okr_id).eq("project_id", project_id).execute()


# ---------------------------------------------------------------------------
# Gantt & Reports
# ---------------------------------------------------------------------------


@router.get("/{project_id}/gantt")
async def get_gantt_data(
    project_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Return tasks with dates formatted for Gantt rendering."""
    admin = get_supabase_admin()
    tasks_res = (
        admin.table("tasks")
        .select("id, title, assignee_id, column_id, due_date, created_at, estimated_hours, priority, labels, status")
        .eq("project_id", project_id)
        .execute()
    )
    sprints_res = (
        admin.table("sprints")
        .select("id, name, start_date, end_date, status")
        .eq("project_id", project_id)
        .execute()
    )

    gantt_tasks = []
    for task in tasks_res.data or []:
        gantt_tasks.append({
            "id": task["id"],
            "name": task["title"],
            "start": task.get("created_at", "")[:10],
            "end": task.get("due_date") or "",
            "progress": 100 if task.get("status") == "done" else (50 if task.get("status") == "in_progress" else 0),
            "assignee_id": task.get("assignee_id"),
            "priority": task.get("priority"),
            "labels": task.get("labels", []),
        })

    return {
        "tasks": gantt_tasks,
        "sprints": sprints_res.data or [],
    }


@router.get("/{project_id}/report")
async def project_report(
    project_id: str,
    org_id: str = Depends(get_tenant_id),
    current_user=Depends(get_current_user),
):
    """Return a time and progress report for the project."""
    admin = get_supabase_admin()

    tasks_res = (
        admin.table("tasks")
        .select("id, title, assignee_id, estimated_hours, status, priority")
        .eq("project_id", project_id)
        .execute()
    )
    time_entries_res = (
        admin.table("time_entries")
        .select("user_id, duration_minutes, created_at")
        .eq("project_id", project_id)
        .execute()
    )

    tasks = tasks_res.data or []
    time_entries = time_entries_res.data or []

    total_estimated = sum(t.get("estimated_hours") or 0 for t in tasks)
    total_logged_minutes = sum(e.get("duration_minutes") or 0 for e in time_entries)
    completed = len([t for t in tasks if t.get("status") == "done"])
    in_progress = len([t for t in tasks if t.get("status") == "in_progress"])

    by_user: Dict[str, float] = {}
    for entry in time_entries:
        uid = entry.get("user_id", "unknown")
        by_user[uid] = by_user.get(uid, 0) + (entry.get("duration_minutes") or 0) / 60

    return {
        "project_id": project_id,
        "summary": {
            "total_tasks": len(tasks),
            "completed_tasks": completed,
            "in_progress_tasks": in_progress,
            "completion_rate": round(completed / len(tasks) * 100, 1) if tasks else 0,
            "total_estimated_hours": round(total_estimated, 2),
            "total_logged_hours": round(total_logged_minutes / 60, 2),
        },
        "hours_by_user": by_user,
        "tasks": tasks,
    }
