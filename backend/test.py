import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import (
    ConfigurationError,
    ConnectionFailure,
    InvalidURI,
    OperationFailure,
)

load_dotenv(
    Path(__file__).resolve().parent / ".env",
    override=True
)

uri = os.getenv("MONGODB_URI", "").strip()

if not uri:
    raise SystemExit("MONGODB_URI is missing in backend/.env.")

client = None

try:
    print("Connecting to MongoDB Atlas...", flush=True)

    client = MongoClient(
        uri,
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=10000,
    )

    client.admin.command("ping")
    print("MongoDB Atlas connection successful!")

except OperationFailure as error:
    print("Authentication/permission error. Code:", error.code)
    print("Check the database username and password.")

except ConnectionFailure:
    print(
        "Connection failed. Check Atlas Network Access, "
        "your current IP address, cluster status and internet."
    )

except (InvalidURI, ConfigurationError):
    print(
        "Connection configuration failed. Check the URI, "
        "password encoding and DNS availability."
    )

except Exception as error:
    print("Error type:", type(error).__name__)

finally:
    if client is not None:
        client.close()