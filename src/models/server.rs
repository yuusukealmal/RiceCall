use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Server {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub announcement: String,
    pub level: i64,
    #[serde(rename = "userIds")]
    pub user_ids: Vec<String>,
    #[serde(rename = "channelIds")]
    pub channel_ids: Vec<String>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub applications: HashMap<String, String>,
    pub permissions: HashMap<String, i64>,
    pub nicknames: HashMap<String, String>,
    pub contributions: HashMap<String, i64>,
    #[serde(rename = "joinDate")]
    pub join_date: HashMap<String, i64>,

} 