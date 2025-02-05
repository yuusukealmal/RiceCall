use crate::{
    db::{Database, DbError},
    models::{
        channel::Channel,
        message::Message,
        server::Server,
        user::{User, UserState},
        MessageType,
    },
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use socketioxide::extract::{Data, SocketRef};
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ConnectServerData {
    #[serde(rename = "serverId")]
    server_id: String,
    #[serde(rename = "userId")]
    user_id: String,
}

#[derive(Deserialize)]
pub struct ChatMessageData {
    #[serde(rename = "serverId")]
    server_id: String,
    message: ChatMessage,
}

#[derive(Deserialize, Serialize)]
pub struct ChatMessage {
    content: String,
    #[serde(rename = "senderId")]
    sender: String,
}

#[derive(Deserialize)]
pub struct ChannelData {
    #[serde(rename = "serverId")]
    server_id: String,
    channel: Channel,
}

#[derive(Deserialize)]
pub struct DeleteChannelData {
    #[serde(rename = "serverId")]
    server_id: String,
    #[serde(rename = "channelId")]
    channel_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ConnectUserData {
    #[serde(rename = "userId")]
    pub user_id: String,
}

#[derive(Deserialize)]
pub struct JoinChannelData {
    #[serde(rename = "serverId")]
    server_id: String,
    #[serde(rename = "channelId")]
    channel_id: String,
    #[serde(rename = "userId")]
    user_id: String,
}

#[derive(Deserialize)]
pub struct LeaveChannelData {
    #[serde(rename = "serverId")]
    server_id: String,
    #[serde(rename = "channelId")]
    channel_id: Option<String>,
    #[serde(rename = "userId")]
    user_id: String,
}

pub async fn handle_connect_server<D: Database>(
    socket: SocketRef,
    Data(data): Data<ConnectServerData>,
    db: Arc<D>,
) -> Result<(), String> {
    if data.server_id.is_empty() || data.user_id.is_empty() {
        error!("Invalid server data");
        socket
            .emit("error", &json!({"message": "Invalid server data"}))
            .ok();
        return Ok(());
    }

    // 獲取伺服器資料
    let server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket
                .emit(
                    "error",
                    &json!({"message": format!("Server({}) not found", data.server_id)}),
                )
                .ok();
            return Ok(());
        }
    };

    // 獲取用戶資料
    let user = match db.get_user(&data.user_id).await {
        Ok(user) => user,
        Err(e) => {
            error!("User({}) not found: {}", data.user_id, e);
            socket
                .emit(
                    "error",
                    &json!({"message": format!("User({}) not found", data.user_id)}),
                )
                .ok();
            return Ok(());
        }
    };

    // 檢查用戶是否已在伺服器中，如果不在則加入
    if !server.user_ids.contains(&user.id) {
        if let Err(e) = db.add_server_user(&server.id, &user.id, 1).await {
            error!("Failed to add user to server: {}", e);
            socket
                .emit("error", &json!({"message": "Failed to add user to server"}))
                .ok();
            return Ok(());
        }
    }

    // 獲取頻道列表
    let channels = match get_server_channels(&*db, &server).await {
        Ok(channels) => channels,
        Err(e) => {
            error!("Failed to get channels: {}", e);
            socket
                .emit("error", &json!({"message": "Failed to get channels"}))
                .ok();
            return Ok(());
        }
    };

    // 獲取用戶列表
    let users = match get_server_users(&*db, &server).await {
        Ok(users) => users,
        Err(e) => {
            error!("Failed to get users: {}", e);
            socket
                .emit("error", &json!({"message": "Failed to get users"}))
                .ok();
            return Ok(());
        }
    };

    // 加入伺服器房間
    socket.join(format!("server_{}", server.id));

    // 如果用戶有當前頻道，也加入該頻道房間
    if let Some(channel_id) = user.current_channel_id {
        socket.join(format!("server_{}_channel_{}", server.id, channel_id));
    }

    // 發送資料給客戶端
    socket.emit("server", &json!(server)).ok();
    socket.emit("channels", &json!(channels)).ok();
    socket.emit("users", &json!(users)).ok();

    info!("User({}) connected to server({})", user.id, server.id);
    Ok(())
}

pub async fn handle_connect_user<D: Database>(
    socket: SocketRef,
    data: Data<ConnectUserData>,
    db: Arc<D>,
) -> Result<(), Box<dyn std::error::Error>> {
    info!("User({}) connecting", data.user_id);

    // 從資料庫取得使用者資料
    let mut user = match db.get_user(&data.user_id).await {
        Ok(user) => user,
        Err(e) => {
            error!("Failed to get user: {}", e);
            socket
                .emit("error", &json!({"message": "Failed to get user"}))
                .ok();
            return Ok(());
        }
    };

    // 更新用戶狀態為在線
    user.state = UserState::Online;
    if let Err(e) = db.update_user(&user).await {
        error!("Failed to update user state: {}", e);
        socket
            .emit("error", &json!({"message": "Failed to update user state"}))
            .ok();
        return Ok(());
    }

    // 發送使用者資料回客戶端
    socket.emit("user", &json!(user)).ok();
    info!("User({}) connected", user.id);
    Ok(())
}

pub async fn handle_chat_message<D: Database>(
    socket: SocketRef,
    Data(data): Data<ChatMessageData>,
    db: Arc<D>,
) -> Result<(), String> {
    // 獲取伺服器和頻道
    let server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket
                .emit(
                    "error",
                    &json!({"message": format!("Server({}) not found", data.server_id)}),
                )
                .ok();
            return Ok(());
        }
    };

    // 獲取發送者資訊
    let sender = match db.get_user(&data.message.sender).await {
        Ok(user) => user,
        Err(e) => {
            error!("User({}) not found: {}", data.message.sender, e);
            socket
                .emit("error", &json!({"message": "User not found"}))
                .ok();
            return Ok(());
        }
    };

    // 檢查發送者是否在頻道中
    if sender.current_channel_id.is_none() {
        error!("User({}) not in any channel", sender.id);
        socket
            .emit("error", &json!({"message": "You are not in any channel"}))
            .ok();
        return Ok(());
    }

    let channel_id = sender.current_channel_id.as_ref().unwrap();

    let message = Message {
        id: Uuid::new_v4().to_string(),
        sender_id: sender.id,
        content: data.message.content,
        timestamp: chrono::Utc::now().timestamp_millis(),
        message_type: MessageType::General,
    };

    // 儲存訊息
    if let Err(e) = db.create_message(&message, channel_id).await {
        error!("Failed to save message: {}", e);
        socket
            .emit("error", &json!({"message": "Failed to save message"}))
            .ok();
        return Ok(());
    }

    // 廣播訊息給頻道內的所有使用者
    socket
        .to(format!("server_{}_channel_{}", server.id, channel_id))
        .emit("message", &json!(message))
        .await
        .map_err(|e| e.to_string())?;

    info!(
        "Message sent in server({}) channel({})",
        server.id, channel_id
    );
    Ok(())
}

pub async fn handle_add_channel<D: Database>(
    socket: SocketRef,
    Data(data): Data<ChannelData>,
    db: Arc<D>,
) -> Result<(), String> {
    // 驗證頻道資料
    if data.channel.name.is_empty() {
        error!("Invalid channel data");
        socket
            .emit(
                "error",
                &json!({
                    "message": "Invalid channel data"
                }),
            )
            .ok();
        return Ok(());
    }

    // 獲取伺服器
    let server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket
                .emit(
                    "error",
                    &json!({
                        "message": format!("Server({}) not found", data.server_id)
                    }),
                )
                .ok();
            return Ok(());
        }
    };

    // 儲存頻道
    if let Err(e) = db.create_channel(&data.channel, &data.server_id).await {
        error!("Failed to create channel: {}", e);
        socket
            .emit(
                "error",
                &json!({
                    "message": "Failed to create channel"
                }),
            )
            .ok();
        return Ok(());
    }

    // 獲取所有頻道並廣播
    let channels = match get_server_channels(&*db, &server).await {
        Ok(channels) => channels,
        Err(e) => {
            error!("Failed to get channels: {}", e);
            socket
                .emit(
                    "error",
                    &json!({
                        "message": "Failed to get channels"
                    }),
                )
                .ok();
            return Ok(());
        }
    };

    socket
        .to(format!("server_{}", server.id))
        .emit("channels", &json!(channels))
        .await
        .map_err(|e| e.to_string())?;

    info!(
        "Added new channel({}) to server({})",
        data.channel.id, server.id
    );
    Ok(())
}

pub async fn handle_edit_channel<D: Database>(
    socket: SocketRef,
    Data(data): Data<ChannelData>,
    db: Arc<D>,
) -> Result<(), String> {
    // 驗證頻道資料
    if data.channel.name.is_empty() {
        error!("Invalid channel data");
        socket
            .emit(
                "error",
                &json!({
                    "message": "Invalid channel data"
                }),
            )
            .ok();
        return Ok(());
    }

    // 獲取伺服器
    let server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket
                .emit(
                    "error",
                    &json!({
                        "message": format!("Server({}) not found", data.server_id)
                    }),
                )
                .ok();
            return Ok(());
        }
    };

    // 更新頻道
    if let Err(e) = db.update_channel(&data.channel).await {
        error!("Failed to update channel: {}", e);
        socket
            .emit(
                "error",
                &json!({
                    "message": "Failed to update channel"
                }),
            )
            .ok();
        return Ok(());
    }

    // 獲取所有頻道並廣播
    let channels = match get_server_channels(&*db, &server).await {
        Ok(channels) => channels,
        Err(e) => {
            error!("Failed to get channels: {}", e);
            socket
                .emit(
                    "error",
                    &json!({
                        "message": "Failed to get channels"
                    }),
                )
                .ok();
            return Ok(());
        }
    };

    socket
        .to(format!("server_{}", server.id))
        .emit("channels", &json!(channels))
        .await
        .map_err(|e| e.to_string())?;

    info!(
        "Updated channel({}) in server({})",
        data.channel.id, server.id
    );
    Ok(())
}

pub async fn handle_delete_channel<D: Database>(
    socket: SocketRef,
    Data(data): Data<DeleteChannelData>,
    db: Arc<D>,
) -> Result<(), String> {
    // 1. 先更新所有在此頻道的用戶
    let users = db
        .get_channel_users(&data.channel_id)
        .await
        .map_err(|e| e.to_string())?;
    for mut user in users {
        if user.current_channel_id == Some(data.channel_id.clone()) {
            user.current_channel_id = None;
            if let Err(e) = db.update_user(&user).await {
                error!("Failed to update user: {}", e);
            }
        }
    }

    // 2. 獲取伺服器
    let server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket
                .emit(
                    "error",
                    &json!({
                        "message": format!("Server({}) not found", data.server_id)
                    }),
                )
                .ok();
            return Ok(());
        }
    };

    // 3. 刪除頻道
    if let Err(e) = db.delete_channel(&data.channel_id).await {
        error!("Failed to delete channel: {}", e);
        socket
            .emit(
                "error",
                &json!({
                    "message": "Failed to delete channel"
                }),
            )
            .ok();
        return Ok(());
    }

    // 4. 廣播更新後的頻道列表
    let channels = match get_server_channels(&*db, &server).await {
        Ok(channels) => channels,
        Err(e) => {
            error!("Failed to get channels: {}", e);
            socket
                .emit(
                    "error",
                    &json!({
                        "message": "Failed to get channels"
                    }),
                )
                .ok();
            return Ok(());
        }
    };

    socket
        .to(format!("server_{}", server.id))
        .emit("channels", &json!(channels))
        .await
        .map_err(|e| e.to_string())?;

    info!(
        "Removed channel({}) from server({})",
        data.channel_id, server.id
    );
    Ok(())
}

pub async fn handle_join_channel<D: Database>(
    socket: SocketRef,
    Data(data): Data<JoinChannelData>,
    db: Arc<D>,
) -> Result<(), String> {
    // 獲取用戶、伺服器和頻道
    let mut user = match db.get_user(&data.user_id).await {
        Ok(user) => user,
        Err(e) => {
            error!("User({}) not found: {}", data.user_id, e);
            socket
                .emit(
                    "error",
                    &json!({"message": format!("User({}) not found", data.user_id)}),
                )
                .ok();
            return Ok(());
        }
    };

    let server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket
                .emit(
                    "error",
                    &json!({"message": format!("Server({}) not found", data.server_id)}),
                )
                .ok();
            return Ok(());
        }
    };

    let mut channel = match db.get_channel(&data.channel_id).await {
        Ok(channel) => channel,
        Err(e) => {
            error!("Channel({}) not found: {}", data.channel_id, e);
            socket
                .emit(
                    "error",
                    &json!({"message": format!("Channel({}) not found", data.channel_id)}),
                )
                .ok();
            return Ok(());
        }
    };

    // 離開當前頻道
    if let Some(current_channel_id) = &user.current_channel_id {
        socket.leave(format!(
            "server_{}_channel_{}",
            server.id, current_channel_id
        ));
    }

    // 更新用戶和頻道資料
    user.current_channel_id = Some(channel.id.clone());
    if !channel.user_ids.contains(&user.id) {
        channel.user_ids.push(user.id.clone());
    }

    // 更新資料庫
    if let Err(e) = db.update_user(&user).await {
        error!("Failed to update user: {}", e);
        socket
            .emit("error", &json!({"message": "Failed to update user"}))
            .ok();
        return Ok(());
    }

    if let Err(e) = db.update_channel(&channel).await {
        error!("Failed to update channel: {}", e);
        socket
            .emit("error", &json!({"message": "Failed to update channel"}))
            .ok();
        return Ok(());
    }

    // 加入新頻道
    socket.join(format!("server_{}_channel_{}", server.id, channel.id));

    // 發送更新後的資料
    let channels = db
        .get_server_channels(&server.id)
        .await
        .map_err(|e| e.to_string())?;
    let users = db
        .get_server_users(&server.id)
        .await
        .map_err(|e| e.to_string())?;
    let messages = db
        .get_channel_messages(&channel.id)
        .await
        .map_err(|e| e.to_string())?;

    socket
        .to(format!("server_{}", server.id))
        .emit("channels", &json!(channels))
        .await
        .map_err(|e| e.to_string())?;
    socket
        .to(format!("server_{}", server.id))
        .emit("users", &json!(users))
        .await
        .map_err(|e| e.to_string())?;
    socket.emit("messages", &json!(messages)).ok();
    socket.emit("user", &json!(user)).ok();

    info!(
        "User({}) joined channel({}) in server({})",
        user.id, channel.id, server.id
    );
    Ok(())
}

pub async fn handle_leave_channel<D: Database>(
    socket: SocketRef,
    Data(data): Data<LeaveChannelData>,
    db: Arc<D>,
) -> Result<(), String> {
    // 獲取用戶資料
    let mut user = match db.get_user(&data.user_id).await {
        Ok(user) => user,
        Err(e) => {
            error!("User({}) not found: {}", data.user_id, e);
            socket
                .emit("error", &json!({"message": "User not found"}))
                .ok();
            return Ok(());
        }
    };

    // 清除當前頻道
    user.current_channel_id = None;
    if let Err(e) = db.update_user(&user).await {
        error!("Failed to update user: {}", e);
        socket
            .emit("error", &json!({"message": "Failed to update user"}))
            .ok();
        return Ok(());
    }

    // 離開 socket room
    if let Some(channel_id) = data.channel_id {
        socket.leave(format!("server_{}_channel_{}", data.server_id, channel_id));
    }

    info!("User({}) left channel", user.id);
    Ok(())
}

// 輔助函數
async fn get_server_channels<D: Database>(
    db: &D,
    server: &Server,
) -> Result<Vec<Channel>, DbError> {
    db.get_server_channels(&server.id).await
}

async fn get_server_messages<D: Database>(
    db: &D,
    channel_id: &str,
) -> Result<Vec<Message>, DbError> {
    db.get_channel_messages(channel_id).await
}

async fn get_server_users<D: Database>(db: &D, server: &Server) -> Result<Vec<User>, DbError> {
    db.get_server_users(&server.id).await
}
