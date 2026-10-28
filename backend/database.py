import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient


ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH, override=True)

mongodb_uri = os.getenv("MONGODB_URI")

if not mongodb_uri:
    raise RuntimeError("MONGODB_URI is missing in backend/.env")

client = MongoClient(
    mongodb_uri,
    serverSelectionTimeoutMS=10000,
    connectTimeoutMS=10000,
    socketTimeoutMS=10000,
    tz_aware=True,
)

db = client[os.getenv("MONGODB_DB", "big_data_ai_lens")]

users_collection = db["users"]
sessions_collection = db["sessions"]
datasets_collection = db["datasets"]
query_history_collection = db["query_history"]