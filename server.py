#!/usr/bin/env python3
"""Local server for personal blog with save & upload API."""

import hashlib
import json
import os
import random
import re
import secrets
import smtplib
import socket
import uuid
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import quote, urlencode, urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from pymongo import MongoClient

PORT = int(os.environ.get("PORT", 8080))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
DATA_PATH = os.path.join(BASE_DIR, "data.json")
USERS_PATH = os.path.join(BASE_DIR, "users.json")
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
DEFAULT_ADMIN_PASSWORD = "ctech2026"
SESSION_DAYS = 30
RESET_CODE_MINUTES = 15
RESET_COOLDOWN_SECONDS = 60
MIN_ADMIN_PASSWORD_LEN = 6
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,32}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# MongoDB setup for professional data storage (Atlas URI from env)
MONGO_URI = os.environ.get("MONGO_URI")
mongo_client = None
mongo_db = None
if MONGO_URI:
    try:
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        mongo_db = mongo_client.get_database("blog")  # or specify /dbname in URI
        mongo_client.admin.command('ping')
        print("  Connected to MongoDB Atlas")
    except Exception as e:
        print(f"  MongoDB connection failed: {e}. Falling back to file storage.")
else:
    print("  No MONGO_URI. Using file storage. Set MONGO_URI env var on Render with your Atlas connection string (mongodb+srv://...).")


def default_config():
    owner_email = ""
    try:
        site_data = load_site_data()
        owner_email = site_data.get("profile", {}).get("email", "").strip()
    except Exception:
        pass
    return {
        "adminPassword": DEFAULT_ADMIN_PASSWORD,
        "ownerEmail": owner_email,
        "smtp": {
            "host": "smtp.gmail.com",
            "port": 587,
            "user": owner_email,
            "appPassword": "",
        },
        "googleOAuth": {
            "clientId": "",
            "clientSecret": "",
        },
    }


def load_config():
    if mongo_db:
        try:
            doc = mongo_db.config.find_one({"_id": "main"})
            if doc:
                config = {k: v for k, v in doc.items() if k != "_id"}
                return config
        except Exception as e:
            print(f"Mongo load_config error: {e}")
    ensure_config()
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_config(config):
    if mongo_db:
        try:
            doc = dict(config)
            doc["_id"] = "main"
            mongo_db.config.replace_one({"_id": "main"}, doc, upsert=True)
            return
        except Exception as e:
            print(f"Mongo save_config error: {e}")
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def ensure_config():
    if mongo_db:
        try:
            doc = mongo_db.config.find_one({"_id": "main"})
            if not doc:
                save_config(default_config())
                print(f"  Đã tạo config in Mongo — mật khẩu mặc định: {DEFAULT_ADMIN_PASSWORD}")
            return
        except Exception as e:
            print(f"Mongo ensure_config error: {e}")
    if not os.path.exists(CONFIG_PATH):
        save_config(default_config())
        print(f"  Đã tạo config.json — mật khẩu mặc định: {DEFAULT_ADMIN_PASSWORD}")
        return
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            config = json.load(f)
    except (OSError, json.JSONDecodeError):
        save_config(default_config())
        return
    changed = False
    defaults = default_config()
    for key, value in defaults.items():
        if key not in config:
            config[key] = value
            changed = True
    if "smtp" not in config or not isinstance(config.get("smtp"), dict):
        config["smtp"] = defaults["smtp"]
        changed = True
    else:
        for smtp_key, smtp_val in defaults["smtp"].items():
            if smtp_key not in config["smtp"]:
                config["smtp"][smtp_key] = smtp_val
                changed = True
    if not config.get("ownerEmail"):
        config["ownerEmail"] = defaults["ownerEmail"]
        changed = True
    if "googleOAuth" not in config or not isinstance(config.get("googleOAuth"), dict):
        config["googleOAuth"] = defaults["googleOAuth"]
        changed = True
    else:
        for oauth_key, oauth_val in defaults["googleOAuth"].items():
            if oauth_key not in config["googleOAuth"]:
                config["googleOAuth"][oauth_key] = oauth_val
                changed = True
    if changed:
        save_config(config)


def get_admin_password():
    try:
        return load_config().get("adminPassword", DEFAULT_ADMIN_PASSWORD)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return DEFAULT_ADMIN_PASSWORD


def get_owner_email():
    config = load_config()
    email = (config.get("ownerEmail") or "").strip().lower()
    if email:
        return email
    try:
        return (load_site_data().get("profile", {}).get("email") or "").strip().lower()
    except (OSError, json.JSONDecodeError):
        return ""


def hash_reset_code(code):
    return hashlib.sha256(code.encode()).hexdigest()


def send_owner_email(subject, body):
    config = load_config()
    smtp_cfg = config.get("smtp") or {}
    host = smtp_cfg.get("host", "smtp.gmail.com")
    port = int(smtp_cfg.get("port", 587))
    user = (smtp_cfg.get("user") or "").strip()
    password = (smtp_cfg.get("appPassword") or "").strip()
    if not user or not password:
        raise ValueError(
            "SMTP chưa cấu hình. Thêm smtp.appPassword vào config.json "
            "(Mật khẩu ứng dụng Gmail)."
        )
    owner_email = get_owner_email()
    if not owner_email:
        raise ValueError("Chưa cấu hình ownerEmail trong config.json hoặc email hồ sơ.")

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = owner_email
    with smtplib.SMTP(host, port, timeout=30) as server:
        server.starttls()
        server.login(user, password)
        server.sendmail(user, [owner_email], msg.as_string())


def validate_new_password(password):
    password = password or ""
    if len(password) < MIN_ADMIN_PASSWORD_LEN:
        raise ValueError(f"Mật khẩu mới phải có ít nhất {MIN_ADMIN_PASSWORD_LEN} ký tự.")
    return password


def load_users_store():
    if mongo_db:
        try:
            doc = mongo_db.users.find_one({"_id": "main"})
            if doc:
                store = {k: v for k, v in doc.items() if k != "_id"}
                return store
            else:
                store = {"users": [], "sessions": []}
                save_users_store(store)
                return store
        except Exception as e:
            print(f"Mongo load_users_store error: {e}")
    if not os.path.exists(USERS_PATH):
        store = {"users": [], "sessions": []}
        save_users_store(store)
        return store
    with open(USERS_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_users_store(store):
    if mongo_db:
        try:
            doc = dict(store)
            doc["_id"] = "main"
            mongo_db.users.replace_one({"_id": "main"}, doc, upsert=True)
            return
        except Exception as e:
            print(f"Mongo save_users_store error: {e}")
    with open(USERS_PATH, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)


def hash_password(password, salt):
    return hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()


def public_user(user):
    data = {
        "id": user["id"],
        "username": user["username"],
        "displayName": user.get("displayName") or user["username"],
        "email": user.get("email", ""),
    }
    if user.get("avatar"):
        data["avatar"] = user["avatar"]
    if user.get("authProvider"):
        data["authProvider"] = user["authProvider"]
    return data


def get_google_oauth_config():
    oauth = load_config().get("googleOAuth") or {}
    client_id = (oauth.get("clientId") or "").strip()
    client_secret = (oauth.get("clientSecret") or "").strip()
    return client_id, client_secret


def google_oauth_enabled():
    client_id, _ = get_google_oauth_config()
    return bool(client_id)


def google_http_json(url, data=None, headers=None, method=None):
    req_headers = dict(headers or {})
    payload = None
    if data is not None:
        payload = urlencode(data).encode("utf-8")
        req_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
    req = Request(url, data=payload, headers=req_headers, method=method or ("POST" if data is not None else "GET"))
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def verify_google_credential(credential, client_id):
    if not credential:
        raise ValueError("missing_credential")
    tokeninfo = google_http_json(f"https://oauth2.googleapis.com/tokeninfo?id_token={quote(credential)}")
    if tokeninfo.get("aud") != client_id:
        raise ValueError("invalid_audience")
    if str(tokeninfo.get("email_verified", "")).lower() not in ("true", "1"):
        raise ValueError("email_not_verified")
    return {
        "id": tokeninfo.get("sub") or "",
        "email": tokeninfo.get("email") or "",
        "name": tokeninfo.get("name") or "",
        "picture": tokeninfo.get("picture") or "",
    }


def unique_username(store, base):
    cleaned = re.sub(r"[^a-z0-9_]", "", (base or "user").lower())[:24]
    if len(cleaned) < 3:
        cleaned = "user"
    candidate = cleaned
    suffix = 1
    taken = {u.get("username") for u in store.get("users", [])}
    while candidate in taken:
        candidate = f"{cleaned}{suffix}"
        suffix += 1
    return candidate


def find_user_by_google(store, google_id, email):
    if google_id:
        user = next((u for u in store.get("users", []) if u.get("googleId") == google_id), None)
        if user:
            return user
    if email:
        return next(
            (u for u in store.get("users", []) if (u.get("email") or "").strip().lower() == email),
            None,
        )
    return None


def upsert_google_user(profile):
    store = load_users_store()
    google_id = profile.get("id") or profile.get("sub") or ""
    email = (profile.get("email") or "").strip().lower()
    name = (profile.get("name") or profile.get("given_name") or "").strip()
    picture = (profile.get("picture") or "").strip()
    user = find_user_by_google(store, google_id, email)

    if user:
        if google_id and not user.get("googleId"):
            user["googleId"] = google_id
        if email and not user.get("email"):
            user["email"] = email
        if name:
            user["displayName"] = name
        if picture:
            user["avatar"] = picture
        user["authProvider"] = "google"
        save_users_store(store)
        return user

    email_local = email.split("@")[0] if email else f"google{google_id[:8]}"
    username = unique_username(store, email_local)
    user = {
        "id": "user-" + uuid.uuid4().hex[:12],
        "username": username,
        "displayName": name or username,
        "email": email,
        "googleId": google_id,
        "authProvider": "google",
        "avatar": picture,
        "salt": "",
        "passwordHash": "",
        "role": "user",
        "createdAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    store.setdefault("users", []).append(user)
    save_users_store(store)
    return user


def prune_sessions(store):
    now = datetime.now(timezone.utc)
    kept = []
    for session in store.get("sessions", []):
        try:
            expires = datetime.fromisoformat(session["expires"].replace("Z", "+00:00"))
        except (ValueError, KeyError):
            continue
        if expires > now:
            kept.append(session)
    store["sessions"] = kept


def find_user_by_token(token):
    if not token:
        return None
    store = load_users_store()
    prune_sessions(store)
    save_users_store(store)
    session = next((s for s in store["sessions"] if s.get("token") == token), None)
    if not session:
        return None
    user = next((u for u in store["users"] if u.get("id") == session.get("userId")), None)
    return user


def create_user_session(user_id):
    store = load_users_store()
    prune_sessions(store)
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    store["sessions"].append({"token": token, "userId": user_id, "expires": expires})
    save_users_store(store)
    return token


def remove_user_session(token):
    store = load_users_store()
    store["sessions"] = [s for s in store.get("sessions", []) if s.get("token") != token]
    save_users_store(store)


def load_site_data():
    if mongo_db:
        try:
            doc = mongo_db.site_data.find_one({"_id": "main"})
            if doc:
                data = {k: v for k, v in doc.items() if k != "_id"}
                return data
            else:
                # Seed from file if present (first time migration)
                if os.path.exists(DATA_PATH):
                    with open(DATA_PATH, encoding="utf-8") as f:
                        seed_data = json.load(f)
                    save_site_data(seed_data)
                    print("  Seeded initial site data to MongoDB from data.json")
                    return seed_data
                # default empty
                default_data = {
                    "profile": {}, "site": {}, "contact": {}, "theme": "ocean",
                    "posts": [], "services": [], "products": []
                }
                save_site_data(default_data)
                return default_data
        except Exception as e:
            print(f"Mongo load_site_data error: {e}")
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_site_data(data):
    if mongo_db:
        try:
            doc = dict(data)
            doc["_id"] = "main"
            mongo_db.site_data.replace_one({"_id": "main"}, doc, upsert=True)
            return
        except Exception as e:
            print(f"Mongo save_site_data error: {e}")
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def make_localized(text):
    text = (text or "").strip()
    return {"vi": text, "en": text, "zh": text, "fr": text, "ru": text, "ko": text, "ja": text}


class BlogHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password, X-User-Token")
        path = urlparse(getattr(self, "path", "") or "").path
        if path in ("/data.json", "/themes.json", "/users.json"):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path in ("/post", "/product"):
            page = "post.html" if path == "/post" else "product.html"
            dest = f"/{page}"
            if parsed.query:
                dest += f"?{parsed.query}"
            self.send_response(301)
            self.send_header("Location", dest)
            self.end_headers()
            return
        if path == "/api/user/me":
            self._handle_user_me()
            return
        if path == "/api/auth/google/status":
            self._handle_google_status()
            return
        if path == "/api/auth/google":
            self._handle_google_start()
            return
        if path == "/api/auth/google/callback":
            self._handle_google_callback()
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/auth":
            self._handle_auth()
        elif parsed.path == "/api/save":
            self._handle_save()
        elif parsed.path == "/api/upload":
            self._handle_upload()
        elif parsed.path == "/api/comment":
            self._handle_comment()
        elif parsed.path == "/api/user/register":
            self._handle_user_register()
        elif parsed.path == "/api/user/login":
            self._handle_user_login()
        elif parsed.path == "/api/user/logout":
            self._handle_user_logout()
        elif parsed.path == "/api/user/post":
            self._handle_user_post()
        elif parsed.path == "/api/admin/forgot-password":
            self._handle_admin_forgot_password()
        elif parsed.path == "/api/admin/reset-password":
            self._handle_admin_reset_password()
        elif parsed.path == "/api/admin/change-password":
            self._handle_admin_change_password()
        elif parsed.path == "/api/admin/google-oauth":
            self._handle_admin_google_oauth()
        elif parsed.path == "/api/auth/google/credential":
            self._handle_google_credential()
        else:
            self.send_response(404)
            self.end_headers()

    def _get_user_from_request(self):
        token = self.headers.get("X-User-Token", "").strip()
        user = find_user_by_token(token)
        return token, user

    def _is_authorized(self):
        required = get_admin_password()
        if not required:
            return True
        provided = self.headers.get("X-Admin-Password", "")
        return provided == required

    def _handle_auth(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            required = get_admin_password()
            if not required or payload.get("password") == required:
                self._json_response(200, {"ok": True})
            else:
                self._json_response(401, {"ok": False, "error": "Invalid password"})
        except Exception as e:
            self._json_response(400, {"ok": False, "error": str(e)})

    def _handle_admin_forgot_password(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            email = (payload.get("email") or "").strip().lower()
            owner_email = get_owner_email()

            if not owner_email:
                self._json_response(400, {"ok": False, "error": "Chưa cấu hình email chủ blog."})
                return
            if not EMAIL_RE.match(email):
                self._json_response(400, {"ok": False, "error": "Email không hợp lệ."})
                return
            if email != owner_email:
                self._json_response(403, {"ok": False, "error": "Email không khớp với Gmail chủ blog."})
                return

            config = load_config()
            now = datetime.now(timezone.utc)
            last_sent = config.get("resetSentAt")
            if last_sent:
                try:
                    sent_at = datetime.fromisoformat(last_sent.replace("Z", "+00:00"))
                    if (now - sent_at).total_seconds() < RESET_COOLDOWN_SECONDS:
                        self._json_response(429, {"ok": False, "error": "Vui lòng đợi 1 phút rồi thử lại."})
                        return
                except ValueError:
                    pass

            code = f"{random.randint(0, 999999):06d}"
            expires = (now + timedelta(minutes=RESET_CODE_MINUTES)).strftime("%Y-%m-%dT%H:%M:%SZ")
            config["resetCodeHash"] = hash_reset_code(code)
            config["resetExpires"] = expires
            config["resetSentAt"] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
            save_config(config)

            body_text = (
                "CTECH — Mã đặt lại mật khẩu quản trị\n\n"
                f"Mã xác nhận: {code}\n"
                f"Có hiệu lực {RESET_CODE_MINUTES} phút.\n\n"
                "Nếu bạn không yêu cầu, hãy bỏ qua email này."
            )
            send_owner_email("CTECH — Đặt lại mật khẩu quản trị", body_text)
            self._json_response(200, {"ok": True, "message": "Đã gửi mã xác nhận tới Gmail chủ blog."})
        except ValueError as e:
            self._json_response(400, {"ok": False, "error": str(e)})
        except smtplib.SMTPException as e:
            self._json_response(500, {"ok": False, "error": f"Không gửi được email: {e}"})
        except Exception as e:
            self._json_response(500, {"ok": False, "error": str(e)})

    def _handle_admin_reset_password(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            email = (payload.get("email") or "").strip().lower()
            code = (payload.get("code") or "").strip()
            new_password = validate_new_password(payload.get("newPassword"))

            owner_email = get_owner_email()
            if not owner_email or email != owner_email:
                self._json_response(403, {"ok": False, "error": "Email không khớp với Gmail chủ blog."})
                return
            if not re.fullmatch(r"\d{6}", code):
                self._json_response(400, {"ok": False, "error": "Mã xác nhận phải gồm 6 chữ số."})
                return

            config = load_config()
            code_hash = config.get("resetCodeHash")
            expires = config.get("resetExpires")
            if not code_hash or not expires:
                self._json_response(400, {"ok": False, "error": "Chưa có mã xác nhận. Hãy yêu cầu gửi lại."})
                return

            try:
                expires_at = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            except ValueError:
                self._json_response(400, {"ok": False, "error": "Mã xác nhận không hợp lệ."})
                return
            if datetime.now(timezone.utc) > expires_at:
                self._json_response(400, {"ok": False, "error": "Mã xác nhận đã hết hạn. Hãy gửi lại mã mới."})
                return
            if hash_reset_code(code) != code_hash:
                self._json_response(400, {"ok": False, "error": "Mã xác nhận không đúng."})
                return

            config["adminPassword"] = new_password
            config.pop("resetCodeHash", None)
            config.pop("resetExpires", None)
            config.pop("resetSentAt", None)
            save_config(config)
            self._json_response(200, {"ok": True, "message": "Đã đặt lại mật khẩu quản trị."})
        except ValueError as e:
            self._json_response(400, {"ok": False, "error": str(e)})
        except Exception as e:
            self._json_response(500, {"ok": False, "error": str(e)})

    def _handle_admin_change_password(self):
        if not self._is_authorized():
            self._json_response(401, {"ok": False, "error": "Unauthorized"})
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            current = payload.get("currentPassword") or ""
            new_password = validate_new_password(payload.get("newPassword"))
            confirm = payload.get("confirmPassword") or ""

            if new_password != confirm:
                self._json_response(400, {"ok": False, "error": "Mật khẩu mới và xác nhận không khớp."})
                return
            if current != get_admin_password():
                self._json_response(403, {"ok": False, "error": "Mật khẩu hiện tại không đúng."})
                return
            if current == new_password:
                self._json_response(400, {"ok": False, "error": "Mật khẩu mới phải khác mật khẩu hiện tại."})
                return

            config = load_config()
            config["adminPassword"] = new_password
            config.pop("resetCodeHash", None)
            config.pop("resetExpires", None)
            config.pop("resetSentAt", None)
            save_config(config)
            self._json_response(200, {"ok": True, "message": "Đã đổi mật khẩu quản trị."})
        except ValueError as e:
            self._json_response(400, {"ok": False, "error": str(e)})
        except Exception as e:
            self._json_response(500, {"ok": False, "error": str(e)})

    def _handle_save(self):
        if not self._is_authorized():
            self._json_response(401, {"ok": False, "error": "Unauthorized"})
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            data = json.loads(body.decode("utf-8"))
            save_site_data(data)
            self._json_response(200, {"ok": True})
        except Exception as e:
            self._json_response(500, {"ok": False, "error": str(e)})

    def _handle_upload(self):
        _, user = self._get_user_from_request()
        if not self._is_authorized() and not user:
            self._json_response(401, {"ok": False, "error": "Unauthorized"})
            return

        content_type = self.headers.get("Content-Type", "")

        if "multipart/form-data" not in content_type:
            self._json_response(400, {"ok": False, "error": "Expected multipart/form-data"})
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            boundary = content_type.split("boundary=")[1].encode()
            parts = body.split(b"--" + boundary)

            file_data = None
            filename = None

            for part in parts:
                if b"filename=" not in part:
                    continue
                header_end = part.find(b"\r\n\r\n")
                if header_end == -1:
                    continue
                headers = part[:header_end].decode("utf-8", errors="ignore")
                file_data = part[header_end + 4:]
                if file_data.endswith(b"\r\n"):
                    file_data = file_data[:-2]

                match = re.search(r'filename="([^"]+)"', headers)
                if match:
                    filename = match.group(1)
                break

            if not file_data or not filename:
                self._json_response(400, {"ok": False, "error": "No file found"})
                return

            ext = os.path.splitext(filename)[1].lower()
            if ext not in ALLOWED_EXT:
                self._json_response(400, {"ok": False, "error": f"File type {ext} not allowed"})
                return

            os.makedirs(UPLOAD_DIR, exist_ok=True)
            safe_name = f"{uuid.uuid4().hex}{ext}"
            save_path = os.path.join(UPLOAD_DIR, safe_name)

            with open(save_path, "wb") as f:
                f.write(file_data)

            url = f"/uploads/{safe_name}"
            # For cross-origin (Vercel frontend + Render backend), return absolute URL
            host = self.headers.get('Host', '')
            if host:
                scheme = 'https' if 'onrender' in host.lower() or self.headers.get('X-Forwarded-Proto') == 'https' else 'http'
                url = f"{scheme}://{host}/uploads/{safe_name}"
            self._json_response(200, {"ok": True, "url": url})
        except Exception as e:
            self._json_response(500, {"ok": False, "error": str(e)})

    def _handle_comment(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            payload = json.loads(body.decode("utf-8"))
            post_id = (payload.get("postId") or "").strip()
            content = (payload.get("content") or "").strip()[:2000]
            _, user = self._get_user_from_request()
            name = (payload.get("name") or "").strip()[:80]
            if user:
                name = user.get("displayName") or user.get("username") or name

            if not post_id or not name or not content:
                self._json_response(400, {"ok": False, "error": "Missing fields"})
                return

            data = load_site_data()
            post = next((p for p in data.get("posts", []) if p.get("id") == post_id), None)
            if not post:
                self._json_response(404, {"ok": False, "error": "Post not found"})
                return

            comment = {
                "id": "cmt-" + uuid.uuid4().hex[:12],
                "name": name,
                "content": content,
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
            }
            if user:
                comment["userId"] = user["id"]
            post.setdefault("comments", []).append(comment)
            save_site_data(data)

            self._json_response(200, {"ok": True, "comment": comment})
        except Exception as e:
            self._json_response(500, {"ok": False, "error": str(e)})

    def _handle_user_register(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            username = (payload.get("username") or "").strip().lower()
            password = payload.get("password") or ""
            display_name = (payload.get("displayName") or username).strip()[:80]
            email = (payload.get("email") or "").strip()[:120]

            if not USERNAME_RE.match(username):
                self._json_response(400, {"ok": False, "error": "Invalid username"})
                return
            if len(password) < 6:
                self._json_response(400, {"ok": False, "error": "Password too short"})
                return

            store = load_users_store()
            if any(u.get("username") == username for u in store.get("users", [])):
                self._json_response(409, {"ok": False, "error": "Username taken"})
                return

            salt = secrets.token_hex(16)
            user = {
                "id": "user-" + uuid.uuid4().hex[:12],
                "username": username,
                "displayName": display_name or username,
                "email": email,
                "salt": salt,
                "passwordHash": hash_password(password, salt),
                "role": "user",
                "createdAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            }
            store.setdefault("users", []).append(user)
            save_users_store(store)

            token = create_user_session(user["id"])
            self._json_response(200, {"ok": True, "token": token, "user": public_user(user)})
        except Exception as e:
            self._json_response(500, {"ok": False, "error": str(e)})

    def _handle_user_login(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            username = (payload.get("username") or "").strip().lower()
            password = payload.get("password") or ""

            store = load_users_store()
            user = next((u for u in store.get("users", []) if u.get("username") == username), None)
            if not user:
                self._json_response(401, {"ok": False, "error": "Invalid credentials"})
                return
            if user.get("authProvider") == "google" and not user.get("passwordHash"):
                self._json_response(401, {"ok": False, "error": "Use Google sign-in"})
                return
            if hash_password(password, user.get("salt", "")) != user.get("passwordHash"):
                self._json_response(401, {"ok": False, "error": "Invalid credentials"})
                return

            token = create_user_session(user["id"])
            self._json_response(200, {"ok": True, "token": token, "user": public_user(user)})
        except Exception as e:
            self._json_response(500, {"ok": False, "error": str(e)})

    def _handle_user_logout(self):
        token, _ = self._get_user_from_request()
        if token:
            remove_user_session(token)
        self._json_response(200, {"ok": True})

    def _handle_user_me(self):
        _, user = self._get_user_from_request()
        if not user:
            self._json_response(401, {"ok": False, "error": "Not logged in"})
            return
        self._json_response(200, {"ok": True, "user": public_user(user)})

    def _request_origin(self):
        proto = self.headers.get("X-Forwarded-Proto", "http").split(",")[0].strip()
        host = self.headers.get("X-Forwarded-Host") or self.headers.get("Host") or f"localhost:{PORT}"
        host = host.split(",")[0].strip()
        if "trycloudflare.com" in host or "ts.net" in host:
            proto = "https"
        return f"{proto}://{host}"

    def _google_redirect_uri(self):
        return f"{self._request_origin()}/api/auth/google/callback"

    def _redirect(self, location):
        self.send_response(302)
        self.send_header("Location", location)
        self.end_headers()

    def _oauth_state_path(self):
        return os.path.join(BASE_DIR, "oauth_states.json")

    def _load_oauth_states(self):
        path = self._oauth_state_path()
        if not os.path.exists(path):
            return {}
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            return data if isinstance(data, dict) else {}
        except (OSError, json.JSONDecodeError):
            return {}

    def _save_oauth_states(self, states):
        now = datetime.now(timezone.utc)
        kept = {}
        for key, value in states.items():
            try:
                expires = datetime.fromisoformat(value["expires"].replace("Z", "+00:00"))
            except (ValueError, KeyError, TypeError):
                continue
            if expires > now:
                kept[key] = value
        with open(self._oauth_state_path(), "w", encoding="utf-8") as f:
            json.dump(kept, f, ensure_ascii=False, indent=2)

    def _store_oauth_state(self, state):
        states = self._load_oauth_states()
        states[state] = {
            "expires": (datetime.now(timezone.utc) + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        self._save_oauth_states(states)

    def _pop_oauth_state(self, state):
        states = self._load_oauth_states()
        entry = states.pop(state, None)
        self._save_oauth_states(states)
        if not entry:
            return False
        try:
            expires = datetime.fromisoformat(entry["expires"].replace("Z", "+00:00"))
        except (ValueError, KeyError):
            return False
        return expires > datetime.now(timezone.utc)

    def _handle_google_status(self):
        client_id, _ = get_google_oauth_config()
        self._json_response(200, {"ok": True, "enabled": google_oauth_enabled(), "clientId": client_id})

    def _handle_google_start(self):
        client_id, client_secret = get_google_oauth_config()
        if not client_id:
            self._redirect("/account.html?error=google_not_configured")
            return
        if not client_secret:
            self._redirect("/account.html")
            return
        state = secrets.token_urlsafe(24)
        self._store_oauth_state(state)
        params = urlencode({
            "client_id": client_id,
            "redirect_uri": self._google_redirect_uri(),
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "prompt": "select_account",
            "access_type": "online",
        })
        self._redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")

    def _handle_google_callback(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        error = (query.get("error") or [""])[0]
        if error:
            self._redirect(f"/account.html?error=google_{error}")
            return

        code = (query.get("code") or [""])[0]
        state = (query.get("state") or [""])[0]
        if not code or not state or not self._pop_oauth_state(state):
            self._redirect("/account.html?error=google_invalid_state")
            return
        if not google_oauth_enabled():
            self._redirect("/account.html?error=google_not_configured")
            return

        client_id, client_secret = get_google_oauth_config()
        redirect_uri = self._google_redirect_uri()
        try:
            token_data = google_http_json(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            access_token = token_data.get("access_token")
            if not access_token:
                raise ValueError("missing_access_token")
            profile = google_http_json(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            user = upsert_google_user(profile)
            session_token = create_user_session(user["id"])
            self._redirect(f"/google-callback.html?token={session_token}")
        except (HTTPError, URLError, ValueError, json.JSONDecodeError, KeyError):
            self._redirect("/account.html?error=google_failed")

    def _handle_google_credential(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            credential = (payload.get("credential") or "").strip()
            client_id, _ = get_google_oauth_config()
            if not client_id:
                self._json_response(400, {"ok": False, "error": "Google OAuth chưa cấu hình"})
                return
            profile = verify_google_credential(credential, client_id)
            user = upsert_google_user(profile)
            token = create_user_session(user["id"])
            self._json_response(200, {"ok": True, "token": token, "user": public_user(user)})
        except ValueError as e:
            self._json_response(400, {"ok": False, "error": str(e)})
        except (HTTPError, URLError, json.JSONDecodeError, KeyError) as e:
            self._json_response(500, {"ok": False, "error": f"Google sign-in failed: {e}"})

    def _handle_admin_google_oauth(self):
        if not self._is_authorized():
            self._json_response(401, {"ok": False, "error": "Unauthorized"})
            return
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            client_id = (payload.get("clientId") or "").strip()
            if not client_id.endswith(".apps.googleusercontent.com"):
                self._json_response(400, {"ok": False, "error": "Client ID không hợp lệ"})
                return
            config = load_config()
            config.setdefault("googleOAuth", {})
            config["googleOAuth"]["clientId"] = client_id
            save_config(config)
            self._json_response(200, {"ok": True, "message": "Đã lưu Google Client ID"})
        except Exception as e:
            self._json_response(500, {"ok": False, "error": str(e)})

    def _handle_user_post(self):
        _, user = self._get_user_from_request()
        if not user:
            self._json_response(401, {"ok": False, "error": "Login required"})
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
            title = (payload.get("title") or "").strip()
            content = (payload.get("content") or "").strip()
            excerpt = (payload.get("excerpt") or content[:180]).strip()
            review_target = (payload.get("reviewTarget") or "").strip()
            image = (payload.get("image") or "").strip()
            tags = payload.get("tags") or []
            if isinstance(tags, str):
                tags = [t.strip() for t in tags.split(",") if t.strip()]
            rating = payload.get("rating")
            rating = float(rating) if rating not in (None, "") else None
            if rating is not None and (rating < 0 or rating > 10):
                rating = None

            if not title or not content:
                self._json_response(400, {"ok": False, "error": "Title and content required"})
                return

            post = {
                "id": "post-" + uuid.uuid4().hex[:12],
                "title": make_localized(title),
                "excerpt": make_localized(excerpt),
                "content": make_localized(content),
                "reviewTarget": make_localized(review_target) if review_target else None,
                "image": image,
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "tags": tags[:12],
                "rating": rating,
                "published": True,
                "comments": [],
                "authorId": user["id"],
                "authorName": user.get("displayName") or user.get("username"),
            }
            if not post["reviewTarget"]:
                del post["reviewTarget"]

            data = load_site_data()
            data.setdefault("posts", []).insert(0, post)
            save_site_data(data)
            self._json_response(200, {"ok": True, "post": post})
        except Exception as e:
            self._json_response(500, {"ok": False, "error": str(e)})

    def _json_response(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Admin-Password, Content-Type, X-User-Token')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")


def get_lan_ip():
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except OSError:
        return None


def main():
    os.chdir(BASE_DIR)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ensure_config()
    admin_pass = get_admin_password()
    host = os.environ.get("HOST", "0.0.0.0")
    server = HTTPServer((host, PORT), BlogHandler)
    lan_ip = get_lan_ip()
    print("=" * 50)
    print("  CTECH - Blog đánh giá công nghệ")
    print("=" * 50)
    print(f"  Máy tính:  http://localhost:{PORT}")
    if lan_ip:
        print(f"  Điện thoại: http://{lan_ip}:{PORT}")
        print("  (PC dùng LAN, điện thoại Wi-Fi — cùng 1 router là được)")
        print("  IP điện thoại phải cùng dải 192.168.8.x ~ 192.168.11.x")
        print("  Không vào được? Chạy setup-phone-access.bat (Run as administrator)")
    print(f"  Thành viên: http://localhost:{PORT}/account.html")
    print(f"  Quản trị:  http://localhost:{PORT}/admin/login.html")
    print(f"  Mật khẩu:  {admin_pass}")
    print("  (Đổi mật khẩu trong file config.json)")
    domain_path = os.path.join(BASE_DIR, "domain.json")
    if os.path.exists(domain_path):
        try:
            with open(domain_path, encoding="utf-8") as f:
                domain_cfg = json.load(f)
            if domain_cfg.get("publicUrl"):
                print(f"  Tên miền cố định: {domain_cfg['publicUrl']}")
                print("  (chạy start-domain.bat để giữ tunnel)")
        except (json.JSONDecodeError, OSError):
            pass
    print("  Link tạm (đổi mỗi lần): start-public.bat")
    print("  Tên miền cố định: setup-domain.bat → start-domain.bat")
    print("  Không mua tên miền: start-tailscale-funnel.bat")
    print("  Nhấn Ctrl+C để dừng server")
    print("=" * 50)

    # Seed data into MongoDB on startup if collections are empty
    if mongo_db:
        print("  Seeding MongoDB if empty...")
        try:
            load_site_data()  # seeds profile, posts, site, etc. if empty
            load_users_store()  # seeds users if empty
            load_config()  # seeds config if empty
            print("  MongoDB seeding complete (or already had data).")
        except Exception as e:
            print(f"  Seeding error: {e}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer đã dừng.")
        server.server_close()


if __name__ == "__main__":
    main()