use crate::{
    db::{Database, DbError},
    models::user::{User, UserGender, UserState},
};
use crate::handlers::{ApiResult, ApiError};
use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;

#[derive(Deserialize)]
pub struct LoginRequest {
    account: String,
    password: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    username: String,
    account: String,
    password: String,
    gender: Option<UserGender>,
}

#[derive(Deserialize)]
pub struct UpdateUserRequest {
    user_id: String,
    name: String,
    gender: Option<UserGender>,
}

#[derive(Serialize)]
pub struct UserResponse {
    id: String,
    name: String,
    account: String,
    gender: UserGender,
    avatar: Option<String>,
    level: i64,
    state: UserState,
    current_channel_id: Option<String>,
    created_at: i64,
    last_login_at: Option<i64>,
}

#[derive(Serialize)]
pub struct AuthResponse {
    message: String,
    user: UserResponse,
}

pub async fn handle_login<D: Database>(
    State(db): State<Arc<D>>,
    Json(payload): Json<LoginRequest>,
) -> ApiResult<AuthResponse> {
    // 驗證必填欄位
    if payload.account.is_empty() || payload.password.is_empty() {
        return Err(ApiError(StatusCode::BAD_REQUEST, "Missing credentials".into()));
    }

    // 從資料庫獲取用戶
    let user = match db.get_user_by_account(&payload.account).await {
        Ok(user) => user,
        Err(DbError::NotFound) => {
            return Err(ApiError(StatusCode::UNAUTHORIZED, "找不到此帳號".into()));
        }
        Err(_) => {
            return Err(ApiError(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Login failed".into(),
            ));
        }
    };

    // 驗證密碼
    let password_matches = verify(payload.password, user.password.as_str()).map_err(|_| {
        ApiError(StatusCode::INTERNAL_SERVER_ERROR, "密碼驗證失敗".into())
    })?;

    if !password_matches {
        return Err(ApiError(StatusCode::UNAUTHORIZED, "密碼錯誤".into()));
    }

    // 更新用戶的最後登入時間和狀態
    let mut user = user;
    user.last_login_at = Some(Utc::now().timestamp_millis());
    user.state = UserState::Online;

    if let Err(e) = db.update_user(&user).await {
        return Err(ApiError(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to update user state: {}", e),
        ));
    }

    Ok(Json(AuthResponse {
        message: "Login successful".into(),
        user: UserResponse {
            id: user.id,
            name: user.name,
            account: user.account,
            gender: user.gender,
            avatar: user.avatar,
            level: user.level,
            state: user.state,
            current_channel_id: user.current_channel_id,
            created_at: user.created_at,
            last_login_at: user.last_login_at,
        },
    }))
}

pub async fn handle_register<D: Database>(
    State(db): State<Arc<D>>,
    Json(payload): Json<RegisterRequest>,
) -> ApiResult<AuthResponse> {
    // 驗證必填欄位
    if payload.username.is_empty() || payload.account.is_empty() || payload.password.is_empty() {
        return Err(ApiError(
            StatusCode::BAD_REQUEST,
            "Missing required fields".into(),
        ));
    }

    // 檢查帳號是否已存在
    if let Ok(_) = db.get_user_by_account(&payload.account).await {
        return Err(ApiError(
            StatusCode::CONFLICT,
            "此帳號已被註冊".into(),
        ));
    }

    // 對密碼進行加密
    let hashed_password = hash(payload.password.as_bytes(), DEFAULT_COST).map_err(|_| {
        ApiError(
            StatusCode::INTERNAL_SERVER_ERROR,
            "密碼加密失敗".into(),
        )
    })?;

    // 創建新用戶
    let user = User {
        id: uuid::Uuid::new_v4().to_string(),
        name: payload.username,
        account: payload.account,
        password: hashed_password,
        gender: payload.gender.unwrap_or(UserGender::Male),
        avatar: None,
        level: 0,
        created_at: Utc::now().timestamp_millis(),
        last_login_at: None,
        state: UserState::Online,
        current_channel_id: None,
    };

    if let Err(e) = db.create_user(&user).await {
        return Err(ApiError(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Registration failed: {}", e),
        ));
    }

    Ok(Json(AuthResponse {
        message: "Registration successful".into(),
        user: UserResponse {
            id: user.id,
            name: user.name,
            account: user.account,
            gender: user.gender,
            avatar: user.avatar,
            level: user.level,
            state: user.state,
            current_channel_id: user.current_channel_id,
            created_at: user.created_at,
            last_login_at: user.last_login_at,
        },
    }))
}

pub async fn handle_update_user<D: Database>(
    State(db): State<Arc<D>>,
    Json(payload): Json<UpdateUserRequest>,
) -> ApiResult<AuthResponse> {
    // 驗證必填欄位
    if payload.name.is_empty() {
        return Err(ApiError(StatusCode::BAD_REQUEST, "名稱為必填".into()));
    }

    // 從資料庫獲取用戶
    let mut user = match db.get_user(&payload.user_id).await {
        Ok(user) => user,
        Err(DbError::NotFound) => {
            return Err(ApiError(StatusCode::NOT_FOUND, "找不到此用戶".into()));
        }
        Err(_) => {
            return Err(ApiError(
                StatusCode::INTERNAL_SERVER_ERROR,
                "更新失敗".into(),
            ));
        }
    };

    // 更新用戶資料
    user.name = payload.name;
    if let Some(gender) = payload.gender {
        user.gender = gender;
    }

    if let Err(e) = db.update_user(&user).await {
        return Err(ApiError(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Update failed: {}", e),
        ));
    }

    Ok(Json(AuthResponse {
        message: "更新成功".into(),
        user: UserResponse {
            id: user.id,
            name: user.name,
            account: user.account,
            gender: user.gender,
            avatar: user.avatar,
            level: user.level,
            state: user.state,
            current_channel_id: user.current_channel_id,
            created_at: user.created_at,
            last_login_at: user.last_login_at,
        },
    }))
} 