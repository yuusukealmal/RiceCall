use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessageType {
    #[serde(rename = "general")]
    General,
    #[serde(rename = "info")]
    Info,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    #[serde(rename = "senderId")]
    pub sender_id: String,
    pub content: String,
    pub timestamp: i64,
    #[serde(rename = "type")]
    pub message_type: MessageType,
} 