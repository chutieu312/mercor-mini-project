import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "taskmanager")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]
tasks_collection = db["tasks"]
