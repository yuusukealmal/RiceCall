use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Server {
    pub id: String,
    pub name: String,
    pub announcement: Option<String>,
    pub icon: Option<String>,
    pub users: Vec<String>,
    pub channels: Vec<String>,
    pub messages: Vec<String>,
} 