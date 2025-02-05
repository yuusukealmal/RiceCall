use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub id: String,
    pub name: String,
    pub permission: String,
    #[serde(rename = "isLobby")]
    pub is_lobby: bool,
    #[serde(rename = "isCategory")]
    pub is_category: bool,
    #[serde(rename = "userIds")]
    pub user_ids: Vec<String>,
    #[serde(rename = "messageIds")]
    pub message_ids: Vec<String>,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
}
