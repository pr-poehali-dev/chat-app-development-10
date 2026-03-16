"""
Авторизация TalkNest: регистрация, вход, проверка сессии, выход.
"""
import json
import os
import secrets
import hashlib
import random
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
}

AVATAR_COLORS = [
    "from-cyan-400 to-blue-500",
    "from-violet-500 to-purple-600",
    "from-pink-500 to-rose-500",
    "from-emerald-400 to-teal-500",
    "from-orange-400 to-amber-500",
    "from-fuchsia-500 to-pink-600",
]


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def resp(status: int, data: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {**CORS, "Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False),
    }


def get_user_by_token(conn, token: str):
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.username, u.display_name, u.avatar_color "
        "FROM sessions s JOIN users u ON s.user_id = u.id "
        "WHERE s.token = %s AND s.expires_at > NOW()",
        (token,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "username": row[1], "display_name": row[2], "avatar_color": row[3]}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    qs = event.get("queryStringParameters") or {}
    action = qs.get("action", "")
    path = ("/" + action) if action else (event.get("path", "/"))
    headers = event.get("headers") or {}
    token = headers.get("X-Auth-Token") or headers.get("x-auth-token")

    conn = get_conn()

    # GET /me
    if method == "GET" and path.endswith("/me"):
        if not token:
            return resp(401, {"error": "Unauthorized"})
        user = get_user_by_token(conn, token)
        if not user:
            return resp(401, {"error": "Invalid token"})
        return resp(200, {"user": user})

    # Parse body
    body = {}
    raw_body = event.get("body")
    if raw_body:
        parsed = json.loads(raw_body)
        body = json.loads(parsed) if isinstance(parsed, str) else parsed

    # POST /register
    if method == "POST" and path.endswith("/register"):
        username = (body.get("username") or "").strip().lower()
        display_name = (body.get("display_name") or "").strip()
        password = body.get("password") or ""

        if not username or not display_name or not password:
            return resp(400, {"error": "Заполните все поля"})
        if len(password) < 6:
            return resp(400, {"error": "Пароль минимум 6 символов"})

        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            return resp(409, {"error": "Имя пользователя уже занято"})

        color = random.choice(AVATAR_COLORS)
        cur.execute(
            "INSERT INTO users (username, display_name, password_hash, avatar_color) VALUES (%s, %s, %s, %s) RETURNING id",
            (username, display_name, hash_password(password), color),
        )
        user_id = cur.fetchone()[0]
        token_val = secrets.token_hex(32)
        cur.execute("INSERT INTO sessions (user_id, token) VALUES (%s, %s)", (user_id, token_val))
        conn.commit()

        return resp(200, {
            "token": token_val,
            "user": {"id": user_id, "username": username, "display_name": display_name, "avatar_color": color},
        })

    # POST /login
    if method == "POST" and path.endswith("/login"):
        username = (body.get("username") or "").strip().lower()
        password = body.get("password") or ""

        cur = conn.cursor()
        cur.execute(
            "SELECT id, display_name, avatar_color FROM users WHERE username = %s AND password_hash = %s",
            (username, hash_password(password)),
        )
        row = cur.fetchone()
        if not row:
            return resp(401, {"error": "Неверный логин или пароль"})

        user_id, display_name, color = row
        token_val = secrets.token_hex(32)
        cur.execute("INSERT INTO sessions (user_id, token) VALUES (%s, %s)", (user_id, token_val))
        conn.commit()

        return resp(200, {
            "token": token_val,
            "user": {"id": user_id, "username": username, "display_name": display_name, "avatar_color": color},
        })

    # POST /logout
    if method == "POST" and path.endswith("/logout"):
        if token:
            cur = conn.cursor()
            cur.execute("UPDATE sessions SET expires_at = NOW() WHERE token = %s", (token,))
            conn.commit()
        return resp(200, {"ok": True})

    return resp(404, {"error": "Not found"})
