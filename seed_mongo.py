#!/usr/bin/env python3
"""
Standalone script to initialize MongoDB Atlas collections (tables)
for the CTECH Blog project.

This seeds data from local JSON files (data.json, users.json, config.json)
into the 'ctech' database on MongoDB Atlas.

Run this locally after setting up MongoDB Atlas (free tier is fine).

Usage:
  pip install pymongo
  python seed_mongo.py

The script is idempotent: it uses replace_one with upsert, so running multiple times is safe.
It will create collections on first insert if they don't exist.

Collections created:
- site_data: main site data (profile, site info, posts, services, products, etc.)
- users: user accounts and sessions
- config: admin config (password, smtp, google oauth, etc.)

Note: 
- Uploads (images) are still file-based in /uploads/. For production on Render, 
  consider adding a persistent Disk or moving images to a CDN (e.g. Cloudinary).
- After seeding, the backend on Render (with MONGO_URI set) will use this data.
- For the deployed site on Render: https://ctech-blog-api.onrender.com
- Admin: https://ctech-blog-api.onrender.com/admin/login.html (password: ctech2026)
"""

import json
import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# === CONFIGURATION ===
# Your MongoDB Atlas URI (from previous messages, with password)
# IMPORTANT: In production, use environment variable instead of hardcoding!
MONGO_URI = "mongodb+srv://ctech:ctech2026@cluster0.brg7fgq.mongodb.net/ctech?retryWrites=true&w=majority&appName=Cluster0"

# Database name (as you specified: "ctech")
DB_NAME = "ctech"

# Paths to seed data files (relative to this script's location)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data.json")
USERS_PATH = os.path.join(BASE_DIR, "users.json")
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")


def connect_to_mongo():
    """Connect to MongoDB Atlas and return the database handle."""
    print(f"Connecting to MongoDB Atlas (DB: {DB_NAME})...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
        # Force connection check
        client.admin.command('ping')
        db = client[DB_NAME]
        print("✓ Connected successfully to MongoDB Atlas!")
        return db
    except ConnectionFailure as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        print("  Check your MONGO_URI, username, password, and network access (IP whitelist).")
        raise
    except Exception as e:
        print(f"✗ Unexpected error connecting to MongoDB: {e}")
        raise


def seed_collection(db, collection_name, data, id_field="_id"):
    """
    Seed a collection with data.
    Uses replace_one with upsert=True so it's safe to re-run.
    For top-level objects like site_data/users/config, we use a single doc with _id="main".
    """
    collection = db[collection_name]
    
    if isinstance(data, list):
        # For lists (e.g. posts inside site_data), we store them inside the parent doc.
        # Here we assume top-level seeding uses a single "main" document.
        # If you want separate docs per item later, we can normalize.
        print(f"  - {collection_name}: expecting dict (not list) for top-level doc. Skipping raw list insert.")
        return 0
    
    # Top-level config objects are stored as one document with _id="main"
    doc = dict(data)  # copy
    doc[id_field] = "main"
    
    result = collection.replace_one({id_field: "main"}, doc, upsert=True)
    
    if result.upserted_id:
        print(f"  ✓ Created/inserted '{collection_name}' document (new)")
        return 1
    elif result.modified_count > 0:
        print(f"  ✓ Updated existing '{collection_name}' document")
        return 1
    else:
        print(f"  - '{collection_name}' document already up to date")
        return 0


def seed_from_json(db, collection_name, json_path, description=""):
    """Load JSON file and seed the collection."""
    if not os.path.exists(json_path):
        print(f"  ! Skipping {collection_name}: {json_path} not found")
        return 0
    
    print(f"Seeding '{collection_name}' from {os.path.basename(json_path)} {description}...")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    count = seed_collection(db, collection_name, data)
    return count


def main():
    print("=" * 60)
    print("CTECH Blog - MongoDB Atlas Seeding Script")
    print("This will create collections and seed initial data.")
    print("=" * 60)
    
    db = connect_to_mongo()
    
    total_inserted = 0
    
    # 1. Main site data (profile, site, contact, theme, posts, services, products, etc.)
    # Stored as single document in 'site_data' collection
    total_inserted += seed_from_json(
        db, 
        "site_data", 
        DATA_PATH,
        "(contains posts, profile, services, etc.)"
    )
    
    # 2. Users and sessions
    total_inserted += seed_from_json(
        db, 
        "users", 
        USERS_PATH,
        "(user accounts + sessions for auth)"
    )
    
    # 3. Config (admin password, SMTP, Google OAuth, etc.)
    total_inserted += seed_from_json(
        db, 
        "config", 
        CONFIG_PATH,
        "(admin settings, email, oauth)"
    )
    
    print("-" * 60)
    print(f"✓ Seeding complete. Documents upserted/updated: {total_inserted}")
    print("\nCollections that should now exist in your 'ctech' database:")
    print("  - site_data")
    print("  - users")
    print("  - config")
    print("\nYou can verify in MongoDB Atlas → your cluster → 'ctech' database.")
    print("The backend (server.py) will now use these collections instead of JSON files.")
    print("Admin panel will be able to read/write live data.")
    print("=" * 60)
    
    # Optional: list collections
    print("\nCurrent collections in DB:")
    for coll in db.list_collection_names():
        count = db[coll].count_documents({})
        print(f"  - {coll}: {count} document(s)")


if __name__ == "__main__":
    main()
