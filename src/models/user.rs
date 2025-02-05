use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserGender {
    Male,
    Female,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserState {
    #[serde(rename = "online")]
    Online,
    #[serde(rename = "dnd")]
    Dnd,
    #[serde(rename = "idle")]
    Idle,
    #[serde(rename = "gn")]
    Gn,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub account: String,
    pub password: String,
    pub gender: UserGender,
    pub avatar: Option<String>,
    pub level: i64,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "lastLoginAt")]
    pub last_login_at: Option<i64>,
    pub state: UserState,
    #[serde(rename = "currentChannelId")]
    pub current_channel_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserData {
    pub id: String,
    pub name: String,
    pub account: String,
    pub gender: String,
}

impl User {
    pub fn new(name: String, account: String, password: String, gender: UserGender) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            account,
            password,
            gender,
            avatar: None,
            level: 0,
            created_at: 0,
            last_login_at: None,
            state: UserState::Online,
            current_channel_id: None,
        }
    }
} 