use super::{Database, DbResult};
use crate::db::DbError;
use crate::my_config::Settings;
use sqlx::error::DatabaseError;
use tracing::{error, info};

pub async fn init_database<D: Database>(db: &D, settings: &Settings) -> DbResult<()> {
    info!("Starting database initialization...");

    // 1. 先建立所有使用者
    info!("Creating users...");
    for user in &settings.initial_data.users {
        info!("Creating user: {}", user.id);
        if let Err(DbError::Sqlx(sqlx::Error::Database(e))) = db.create_user(user).await {
            if !is_unique_violation(&e) {
                error!("Failed to create user {}: {}", user.id, e);
                return Err(DbError::Sqlx(sqlx::Error::Database(e)));
            }
            info!("User {} already exists", user.id);
        }
    }

    // 2. 建立伺服器基本資料
    info!("Creating servers...");
    for server in &settings.initial_data.servers {
        info!("Creating server: {}", server.id);
        if let Err(DbError::Sqlx(sqlx::Error::Database(e))) = db.create_server(server).await {
            if !is_unique_violation(&e) {
                error!("Failed to create server {}: {}", server.id, e);
                return Err(DbError::Sqlx(sqlx::Error::Database(e)));
            }
            info!("Server {} already exists", server.id);
        }
    }

    // 3. 建立頻道
    info!("Creating channels...");
    for server in &settings.initial_data.servers {
        for channel_id in &server.channel_ids {
            if let Some(channel) = settings
                .initial_data
                .channels
                .iter()
                .find(|c| &c.id == channel_id)
            {
                info!("Creating channel: {} for server: {}", channel.id, server.id);
                if let Err(DbError::Sqlx(sqlx::Error::Database(e))) =
                    db.create_channel(channel, &server.id).await
                {
                    if !is_unique_violation(&e) {
                        error!("Failed to create channel {}: {}", channel.id, e);
                        return Err(DbError::Sqlx(sqlx::Error::Database(e)));
                    }
                    info!("Channel {} already exists", channel.id);
                }
            } else {
                error!("Channel {} not found in initial data", channel_id);
            }
        }
    }

    // 4. 建立伺服器-使用者關聯
    info!("Creating server-user relationships...");
    for server in &settings.initial_data.servers {
        for user_id in &server.user_ids {
            let permissions = server.permissions.get(user_id).cloned().unwrap_or(1);
            info!(
                "Adding user {} to server {} with permissions {}",
                user_id, server.id, permissions
            );
            if let Err(DbError::Sqlx(sqlx::Error::Database(e))) =
                db.add_server_user(&server.id, user_id, permissions).await
            {
                if !is_unique_violation(&e) {
                    error!(
                        "Failed to add user {} to server {}: {}",
                        user_id, server.id, e
                    );
                    return Err(DbError::Sqlx(sqlx::Error::Database(e)));
                }
                info!("User {} already in server {}", user_id, server.id);
            }
        }
    }

    // 5. 最後建立訊息
    info!("Creating messages...");
    for message in &settings.initial_data.messages {
        if let Some(first_channel) = settings.initial_data.channels.first() {
            info!(
                "Creating message: {} in channel: {}",
                message.id, first_channel.id
            );
            if let Err(DbError::Sqlx(sqlx::Error::Database(e))) =
                db.create_message(message, &first_channel.id).await
            {
                if !is_unique_violation(&e) {
                    error!("Failed to create message {}: {}", message.id, e);
                    return Err(DbError::Sqlx(sqlx::Error::Database(e)));
                }
                info!("Message {} already exists", message.id);
            }
        }
    }

    info!("Database initialization completed successfully");
    Ok(())
}

fn is_unique_violation(e: &Box<dyn DatabaseError>) -> bool {
    let sqlite_error = e.downcast_ref::<sqlx::sqlite::SqliteError>();
    sqlite_error.code() == Some("1555".into()) || sqlite_error.code() == Some("2067".into())
}
