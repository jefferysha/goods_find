"""认证服务 - 注册、登录、JWT Token 管理"""
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional

from src.domain.models.user import User, UserCreate, UserInfo, TokenResponse
from src.infrastructure.persistence.sqlite_manager import get_db
from src.infrastructure.config.settings import settings

# JWT 配置
JWT_SECRET = settings.web_password + "_jwt_secret_key_2025"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 7 天有效期


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def _create_token(user_id: int, username: str) -> tuple[str, int]:
    """创建 JWT Token，返回 (token, expires_in_seconds)"""
    expires_in = JWT_EXPIRE_HOURS * 3600
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_in


def decode_token(token: str) -> Optional[dict]:
    """解码并验证 JWT Token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def register(data: UserCreate) -> TokenResponse:
    """用户注册"""
    db = await get_db()
    try:
        # 检查用户名是否已存在
        cursor = await db.execute(
            "SELECT id FROM users WHERE username = ?", (data.username,)
        )
        existing = await cursor.fetchone()
        if existing:
            raise ValueError("用户名已被注册")

        password_hash = _hash_password(data.password)
        display_name = data.display_name or data.username

        cursor = await db.execute(
            """INSERT INTO users (username, password_hash, display_name)
               VALUES (?, ?, ?)""",
            (data.username, password_hash, display_name),
        )
        await db.commit()
        user_id = cursor.lastrowid

        # 生成 Token
        token, expires_in = _create_token(user_id, data.username)
        return TokenResponse(
            access_token=token,
            expires_in=expires_in,
            user=UserInfo(
                id=user_id,
                username=data.username,
                display_name=display_name,
                is_active=True,
                created_at=datetime.now().isoformat(),
            ),
        )
    finally:
        await db.close()


async def login(username: str, password: str) -> TokenResponse:
    """用户登录"""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, username, password_hash, display_name, is_active, created_at FROM users WHERE username = ?",
            (username,),
        )
        row = await cursor.fetchone()

        if not row:
            # 向下兼容：如果没有注册用户，尝试用 .env 的旧密码
            if username == settings.web_username and password == settings.web_password:
                # 自动为旧用户创建一条记录
                return await _migrate_legacy_user(db, username, password)
            raise ValueError("用户名或密码错误")

        if not row["is_active"]:
            raise ValueError("该账户已被禁用")

        if not _verify_password(password, row["password_hash"]):
            raise ValueError("用户名或密码错误")

        user_id = row["id"]
        token, expires_in = _create_token(user_id, row["username"])
        return TokenResponse(
            access_token=token,
            expires_in=expires_in,
            user=UserInfo(
                id=user_id,
                username=row["username"],
                display_name=row["display_name"] or row["username"],
                is_active=bool(row["is_active"]),
                created_at=row["created_at"] or "",
            ),
        )
    finally:
        await db.close()


async def _migrate_legacy_user(db, username: str, password: str) -> TokenResponse:
    """将 .env 中的旧用户迁移到 SQLite"""
    password_hash = _hash_password(password)
    cursor = await db.execute(
        """INSERT OR IGNORE INTO users (username, password_hash, display_name)
           VALUES (?, ?, ?)""",
        (username, password_hash, "管理员"),
    )
    await db.commit()

    # 获取用户 ID
    cursor = await db.execute(
        "SELECT id, created_at FROM users WHERE username = ?", (username,)
    )
    row = await cursor.fetchone()
    user_id = row["id"]

    token, expires_in = _create_token(user_id, username)
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user=UserInfo(
            id=user_id,
            username=username,
            display_name="管理员",
            is_active=True,
            created_at=row["created_at"] or "",
        ),
    )


async def get_user_by_id(user_id: int) -> Optional[UserInfo]:
    """通过 ID 获取用户信息"""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, username, display_name, is_active, created_at FROM users WHERE id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return UserInfo(
            id=row["id"],
            username=row["username"],
            display_name=row["display_name"] or row["username"],
            is_active=bool(row["is_active"]),
            created_at=row["created_at"] or "",
        )
    finally:
        await db.close()


async def change_password(user_id: int, old_password: str, new_password: str) -> bool:
    """修改密码"""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT password_hash FROM users WHERE id = ?", (user_id,)
        )
        row = await cursor.fetchone()
        if not row:
            raise ValueError("用户不存在")

        if not _verify_password(old_password, row["password_hash"]):
            raise ValueError("原密码错误")

        new_hash = _hash_password(new_password)
        await db.execute(
            "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
            (new_hash, user_id),
        )
        await db.commit()
        return True
    finally:
        await db.close()


async def get_user_count() -> int:
    """获取注册用户数量"""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as cnt FROM users")
        row = await cursor.fetchone()
        return row["cnt"] if row else 0
    finally:
        await db.close()
