from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from datetime import datetime
from database import tasks_collection
from models import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(tags=["tasks"])


def task_serializer(task) -> dict:
    return {
        "id": str(task["_id"]),
        "title": task["title"],
        "description": task["description"],
        "status": task["status"],
        "created_at": task["created_at"],
        "updated_at": task["updated_at"],
    }


@router.get("/tasks", response_model=list[TaskResponse])
async def get_tasks():
    tasks = []
    async for task in tasks_collection.find():
        tasks.append(task_serializer(task))
    return tasks


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
    task = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_serializer(task)


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(task: TaskCreate):
    now = datetime.utcnow()
    task_dict = {
        **task.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    result = await tasks_collection.insert_one(task_dict)
    created = await tasks_collection.find_one({"_id": result.inserted_id})
    return task_serializer(created)


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task: TaskUpdate):
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
    update_data = {k: v for k, v in task.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.utcnow()
    result = await tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    return task_serializer(updated)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str):
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid task ID")
    result = await tasks_collection.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
