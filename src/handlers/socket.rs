use crate::{
    db::{Database, DbError},
    models::{channel::Channel, message::Message, server::Server, user::User},
};
use socketioxide::extract::{Data, SocketRef, State};
use std::sync::Arc;
use tracing::{error, info};
use uuid::Uuid;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Deserialize)]
pub struct ConnectServerData {
    server_id: String,
    user_id: String,
}

#[derive(Deserialize)]
pub struct ChatMessageData {
    server_id: String,
    message: ChatMessage,
}

#[derive(Deserialize, Serialize)]
pub struct ChatMessage {
    content: String,
    sender: String,
}


#[derive(Deserialize)]
pub struct ChannelData {
    server_id: String,
    channel: Channel,
}


#[derive(Deserialize)]
pub struct DeleteChannelData {
    server_id: String,
    channel_id: String,
}


pub async fn handle_connect_server<D: Database>(
    socket: SocketRef,
    Data(data): Data<ConnectServerData>,
    State(db): State<Arc<D>>,
) -> Result<(), String> {
    if data.server_id.is_empty() || data.user_id.is_empty() {
        error!("Invalid server data");
        socket.emit("error", &json!({"message": "Invalid server data"})).ok();
        return Ok(());
    }


    // 獲取伺服器資料
    let server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket.emit("error", &json!({"message": format!("Server({}) not found", data.server_id)})).ok();
            return Ok(());
        }
    };


    // 獲取用戶資料
    let mut user = match db.get_user(&data.user_id).await {
        Ok(user) => user,
        Err(e) => {
            error!("User({}) not found: {}", data.user_id, e);
            socket.emit("error", &json!({"message": format!("User({}) not found", data.user_id)})).ok();
            return Ok(());
        }

    };

    // 更新用戶權限和伺服器用戶列表
    let mut server = server.clone();
    if !server.users.contains(&user.id) {
        server.users.push(user.id.clone());
        user.permissions.insert(server.id.clone(), 1);
        
        if let Err(e) = db.update_server(&server).await {
            error!("Failed to update server: {}", e);
            socket.emit("error", &json!({"message": "Failed to update server"})).ok();
            return Ok(());
        }
        

        if let Err(e) = db.update_user(&user).await {
            error!("Failed to update user: {}", e);
            socket.emit("error", &json!({"message": "Failed to update user"})).ok();
            return Ok(());
        }

    }

    // 獲取頻道列表
    let channels = match get_server_channels(&*db, &server).await {
        Ok(channels) => channels,
        Err(e) => {
            error!("Failed to get channels: {}", e);
            socket.emit("error", &json!({"message": "Failed to get channels"})).ok();
            return Ok(());
        }

    };

    // 獲取訊息列表
    let messages = match get_server_messages(&*db, &server).await {
        Ok(messages) => messages,
        Err(e) => {
            error!("Failed to get messages: {}", e);

            socket.emit("error", &json!({"message": "Failed to get messages"})).ok();
            return Ok(());
        }

    };

    // 獲取用戶列表
    let users = match get_server_users(&*db, &server).await {
        Ok(users) => users,
        Err(e) => {

            error!("Failed to get users: {}", e);
            socket.emit("error", &json!({"message": "Failed to get users"})).ok();
            return Ok(());
        }

    };

    // 加入房間
    socket.join(format!("server_{}", server.id));

    // 發送資料給客戶端
    socket.emit("serverData", &json!({
        "server": server,
        "channels": channels,
        "messages": messages,
        "users": users,
    })).ok();


    info!("User({}) connected to server({})", user.id, server.id);
    Ok(())
}

pub async fn handle_chat_message<D: Database>(
    socket: SocketRef,
    Data(data): Data<ChatMessageData>,
    State(db): State<Arc<D>>,
) -> Result<(), String> {
    let message = Message {
        id: Uuid::new_v4().to_string(),
        sender: data.message.sender,
        content: data.message.content,
        timestamp: chrono::Utc::now().timestamp_millis(),
    };

    // 獲取伺服器
    let mut server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket.emit("error", &json!({"message": format!("Server({}) not found", data.server_id)})).ok();
            return Ok(());
        }

    };

    // 儲存訊息
    if let Err(e) = db.create_message(&message).await {
        error!("Failed to save message: {}", e);
        socket.emit("error", &json!({"message": "Failed to save message"})).ok();
        return Ok(());
    }


    // 更新伺服器訊息列表
    server.messages.push(message.id.clone());
    if let Err(e) = db.update_server(&server).await {
        error!("Failed to update server: {}", e);
        socket.emit("error", &json!({"message": "Failed to update server"})).ok();
        return Ok(());
    }


    // 廣播訊息給所有在同一伺服器的用戶
    let messages = match get_server_messages(&*db, &server).await {
        Ok(messages) => messages,
        Err(e) => {
            error!("Failed to get messages: {}", e);

            socket.emit("error", &json!({"message": "Failed to get messages"})).ok();
            return Ok(());
        }

    };

    let messages_json = serde_json::to_value(messages).unwrap();

    if let Err(e) = socket.to(format!("server_{}", server.id))
        .emit("chatMessage", &messages_json)
        .await {
            error!("Failed to send message: {}", e);
        }

    info!("User({}) sent message to server({})", message.sender, server.id);
    Ok(())
}

pub async fn handle_add_channel<D: Database>(
    socket: SocketRef,
    Data(data): Data<ChannelData>,
    State(db): State<Arc<D>>,
) -> Result<(), String> {
    // 驗證頻道資料
    if data.channel.name.is_empty() {
        error!("Invalid channel data");
        socket.emit("error", &json!({
            "message": "Invalid channel data"
        })).ok();
        return Ok(());
    }

    // 獲取伺服器
    let mut server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket.emit("error", &json!({
                "message": format!("Server({}) not found", data.server_id)
            })).ok();
            return Ok(());
        }
    };

    // 儲存頻道
    let channel = data.channel;
    if let Err(e) = db.create_channel(&channel).await {
        error!("Failed to create channel: {}", e);
        socket.emit("error", &json!({
            "message": "Failed to create channel"
        })).ok();
        return Ok(());
    }

    // 更新伺服器頻道列表
    server.channels.push(channel.id.clone());
    if let Err(e) = db.update_server(&server).await {
        error!("Failed to update server: {}", e);
        socket.emit("error", &json!({
            "message": "Failed to update server"
        })).ok();
        return Ok(());
    }

    // 獲取所有頻道並廣播
    let channels = match get_server_channels(&*db, &server).await {
        Ok(channels) => channels,
        Err(e) => {
            error!("Failed to get channels: {}", e);
            socket.emit("error", &json!({
                "message": "Failed to get channels"
            })).ok();
            return Ok(());
        }
    };

    socket.to(format!("server_{}", server.id))
        .emit("channel", &channels)
        .await
        .ok();

    info!("Added new channel({}) to server({})", channel.id, server.id);
    Ok(())
}

pub async fn handle_edit_channel<D: Database>(
    socket: SocketRef,
    Data(data): Data<ChannelData>,
    State(db): State<Arc<D>>,
) -> Result<(), String> {
    // 驗證頻道資料
    if data.channel.name.is_empty() {
        error!("Invalid channel data");
        socket.emit("error", &json!({
            "message": "Invalid channel data"
        })).ok();
        return Ok(());
    }

    // 獲取伺服器
    let server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket.emit("error", &json!({
                "message": format!("Server({}) not found", data.server_id)
            })).ok();
            return Ok(());
        }
    };

    // 更新頻道
    if let Err(e) = db.update_channel(&data.channel).await {
        error!("Failed to update channel: {}", e);
        socket.emit("error", &json!({
            "message": "Failed to update channel"
        })).ok();
        return Ok(());
    }

    // 獲取所有頻道並廣播
    let channels = match get_server_channels(&*db, &server).await {
        Ok(channels) => channels,
        Err(e) => {
            error!("Failed to get channels: {}", e);

            socket.emit("error", &json!({
                "message": "Failed to get channels"
            })).ok();
            return Ok(());
        }
    };

    socket.to(format!("server_{}", server.id))
        .emit("channel", &channels)
        .await
        .ok();

    info!("Updated channel({}) in server({})", data.channel.id, server.id);
    Ok(())
}

pub async fn handle_delete_channel<D: Database>(
    socket: SocketRef,
    Data(data): Data<DeleteChannelData>,
    State(db): State<Arc<D>>,
) -> Result<(), String> {
    // 獲取伺服器
    let mut server = match db.get_server(&data.server_id).await {
        Ok(server) => server,
        Err(e) => {
            error!("Server({}) not found: {}", data.server_id, e);
            socket.emit("error", &json!({
                "message": format!("Server({}) not found", data.server_id)
            })).ok();
            return Ok(());
        }
    };

    // 刪除頻道
    if let Err(e) = db.delete_channel(&data.channel_id).await {
        error!("Failed to delete channel: {}", e);
        socket.emit("error", &json!({
            "message": "Failed to delete channel"
        })).ok();
        return Ok(());
    }

    // 更新伺服器頻道列表
    server.channels.retain(|id| id != &data.channel_id);
    if let Err(e) = db.update_server(&server).await {
        error!("Failed to update server: {}", e);
        socket.emit("error", &json!({
            "message": "Failed to update server"
        })).ok();
        return Ok(());
    }

    // 獲取所有頻道並廣播
    let channels = match get_server_channels(&*db, &server).await {
        Ok(channels) => channels,
        Err(e) => {
            error!("Failed to get channels: {}", e);

            socket.emit("error", &json!({
                "message": "Failed to get channels"
            })).ok();
            
            return Ok(());
        }
    };

    socket.to(format!("server_{}", server.id))
        .emit("channel", &channels)
        .await
        .ok();

    info!("Removed channel({}) from server({})", data.channel_id, server.id);
    Ok(())
}

// 輔助函數
async fn get_server_channels<D: Database>(db: &D, server: &Server) -> Result<Vec<Channel>, DbError> {
    let mut channels = Vec::new();
    for channel_id in &server.channels {
        if let Ok(channel) = db.get_channel(channel_id).await {
            channels.push(channel);
        }
    }
    Ok(channels)
}

async fn get_server_messages<D: Database>(db: &D, server: &Server) -> Result<Vec<Message>, DbError> {
    let mut messages = Vec::new();
    for message_id in &server.messages {
        if let Ok(message) = db.get_message(message_id).await {
            messages.push(message);
        }
    }
    Ok(messages)
}

async fn get_server_users<D: Database>(db: &D, server: &Server) -> Result<Vec<User>, DbError> {
    let mut users = Vec::new();
    for user_id in &server.users {
        if let Ok(user) = db.get_user(user_id).await {
            users.push(user);
        }
    }
    Ok(users)
} 