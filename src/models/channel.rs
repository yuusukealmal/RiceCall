use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub id: String,
    pub name: String,
    pub permission: String,
    pub is_lobby: bool,
    pub is_category: bool,
    pub users: Vec<String>,
    pub parent_id: Option<String>,
} 