use super::{Database, DbError, DbResult};
use crate::models::{Channel, Message, MessageType, Server, User, UserGender, UserState};
use async_trait::async_trait;
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::collections::HashMap;

pub struct SqliteDatabase {
    pool: SqlitePool,
}

impl SqliteDatabase {
    pub async fn new(database_url: &str) -> DbResult<Self> {
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(database_url)
            .await?;

        Ok(Self { pool })
    }
}

#[async_trait]
impl Database for SqliteDatabase {
    async fn init(&self) -> DbResult<()> {
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| DbError::Sqlx(e.into()))?;
        Ok(())
    }

    async fn create_user(&self, user: &User) -> DbResult<()> {
        sqlx::query(
            r#"
            INSERT INTO users (
                id, name, account, password, gender, avatar, 
                level, created_at, last_login_at, state, current_channel_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&user.id)
        .bind(&user.name)
        .bind(&user.account)
        .bind(&user.password)
        .bind(match user.gender {
            UserGender::Male => "Male",
            UserGender::Female => "Female",
        })
        .bind(&user.avatar)
        .bind(user.level)
        .bind(user.created_at)
        .bind(user.last_login_at)
        .bind(match user.state {
            UserState::Online => "online",
            UserState::Dnd => "dnd",
            UserState::Idle => "idle",
            UserState::Gn => "gn",
        })
        .bind(&user.current_channel_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_user(&self, id: &str) -> DbResult<User> {
        let row = sqlx::query!(
            r#"
            SELECT * FROM users WHERE id = ?
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(User {
            id: row.id.expect("id is null"),
            name: row.name,
            account: row.account.expect("account is null"),
            password: row.password.expect("password is null"),
            gender: match row.gender.as_str() {
                "Male" => UserGender::Male,
                "Female" => UserGender::Female,
                _ => return Err(DbError::InvalidData("Invalid gender".into())),
            },
            avatar: row.avatar,
            level: row.level,
            created_at: row.created_at,
            last_login_at: row.last_login_at,
            state: match row.state.as_str() {
                "online" => UserState::Online,
                "dnd" => UserState::Dnd,
                "idle" => UserState::Idle,
                "gn" => UserState::Gn,
                _ => return Err(DbError::InvalidData("Invalid state".into())),
            },
            current_channel_id: row.current_channel_id,
        })
    }

    async fn get_user_by_account(&self, account: &str) -> DbResult<User> {
        let row = sqlx::query!(
            r#"
            SELECT * FROM users WHERE account = ?
            "#,
            account
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(User {
            id: row.id.expect("id is null"),
            name: row.name,
            account: row.account.expect("account is null"),
            password: row.password.expect("password is null"),
            gender: match row.gender.as_str() {
                "Male" => UserGender::Male,
                "Female" => UserGender::Female,
                _ => return Err(DbError::InvalidData("Invalid gender".into())),
            },
            avatar: row.avatar,
            level: row.level,
            created_at: row.created_at,
            last_login_at: row.last_login_at,
            state: match row.state.as_str() {
                "online" => UserState::Online,
                "dnd" => UserState::Dnd,
                "idle" => UserState::Idle,
                "gn" => UserState::Gn,
                _ => return Err(DbError::InvalidData("Invalid state".into())),
            },
            current_channel_id: row.current_channel_id,
        })
    }

    async fn update_user(&self, user: &User) -> DbResult<()> {
        sqlx::query(
            r#"
            UPDATE users 
            SET name = ?, account = ?, password = ?, gender = ?, avatar = ?,
                level = ?, last_login_at = ?, state = ?, current_channel_id = ?
            WHERE id = ?
            "#,
        )
        .bind(&user.name)
        .bind(&user.account)
        .bind(&user.password)
        .bind(match user.gender {
            UserGender::Male => "Male",
            UserGender::Female => "Female",
        })
        .bind(&user.avatar)
        .bind(user.level)
        .bind(user.last_login_at)
        .bind(match user.state {
            UserState::Online => "online",
            UserState::Dnd => "dnd",
            UserState::Idle => "idle",
            UserState::Gn => "gn",
        })
        .bind(&user.current_channel_id)
        .bind(&user.id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_users_list(&self) -> DbResult<Vec<User>> {
        let rows = sqlx::query!(r#"SELECT * FROM users"#)
            .fetch_all(&self.pool)
            .await?;

        rows.into_iter()
            .map(|row| {
                Ok(User {
                    id: row.id.expect("id is null"),
                    name: row.name,
                    account: row.account.expect("account is null"),
                    password: row.password.expect("password is null"),
                    gender: match row.gender.as_str() {
                        "Male" => UserGender::Male,
                        "Female" => UserGender::Female,
                        _ => return Err(DbError::InvalidData("Invalid gender".into())),
                    },
                    avatar: row.avatar,
                    level: row.level,
                    created_at: row.created_at,
                    last_login_at: row.last_login_at,
                    state: match row.state.as_str() {
                        "online" => UserState::Online,
                        "dnd" => UserState::Dnd,
                        "idle" => UserState::Idle,
                        "gn" => UserState::Gn,
                        _ => return Err(DbError::InvalidData("Invalid state".into())),
                    },
                    current_channel_id: row.current_channel_id,
                })
            })
            .collect()
    }

    // Server operations
    async fn create_server(&self, server: &Server) -> DbResult<()> {
        let mut tx = self.pool.begin().await?;

        sqlx::query(
            r#"
            INSERT INTO servers (id, name, icon, announcement, level, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&server.id)
        .bind(&server.name)
        .bind(&server.icon)
        .bind(&server.announcement)
        .bind(server.level)
        .bind(server.created_at)
        .execute(&mut *tx)
        .await?;

        // Insert server users with their permissions, nicknames, etc.
        for user_id in &server.user_ids {
            sqlx::query(
                r#"
                INSERT INTO server_users (
                    server_id, user_id, permissions, nickname, 
                    contribution, join_date
                )
                VALUES (?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&server.id)
            .bind(user_id)
            .bind(server.permissions.get(user_id).unwrap_or(&0))
            .bind(server.nicknames.get(user_id))
            .bind(server.contributions.get(user_id).unwrap_or(&0))
            .bind(server.join_date.get(user_id).unwrap_or(&0))
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    async fn get_server(&self, id: &str) -> DbResult<Server> {
        let mut tx = self.pool.begin().await?;

        let server_row = sqlx::query!(r#"SELECT * FROM servers WHERE id = ?"#, id)
            .fetch_one(&mut *tx)
            .await?;

        let users_rows = sqlx::query!(r#"SELECT * FROM server_users WHERE server_id = ?"#, id)
            .fetch_all(&mut *tx)
            .await?;

        let applications = sqlx::query!(
            r#"SELECT user_id, message FROM server_applications WHERE server_id = ?"#,
            id
        )
        .fetch_all(&mut *tx)
        .await?;

        let channels = sqlx::query!(r#"SELECT id FROM channels WHERE server_id = ?"#, id)
            .fetch_all(&mut *tx)
            .await?;

        let mut user_ids = Vec::new();
        let mut permissions = HashMap::new();
        let mut nicknames = HashMap::new();
        let mut contributions = HashMap::new();
        let mut join_date = HashMap::new();
        let mut applications_map = HashMap::new();
        let channel_ids: Vec<String> = channels.into_iter().filter_map(|r| r.id).collect();

        for row in users_rows {
            user_ids.push(row.user_id.clone());
            permissions.insert(row.user_id.clone(), row.permissions);
            if let Some(nickname) = row.nickname {
                nicknames.insert(row.user_id.clone(), nickname);
            }
            contributions.insert(row.user_id.clone(), row.contribution);
            join_date.insert(row.user_id, row.join_date);
        }

        for app in applications {
            applications_map.insert(app.user_id, app.message);
        }

        tx.commit().await?;

        Ok(Server {
            id: server_row.id.expect("id is null"),
            name: server_row.name,
            icon: server_row.icon,
            announcement: server_row.announcement,
            level: server_row.level,
            user_ids,
            channel_ids,
            created_at: server_row.created_at,
            applications: applications_map,
            permissions,
            nicknames,
            contributions,
            join_date,
        })
    }

    async fn update_server(&self, server: &Server) -> DbResult<()> {
        sqlx::query!(
            r#"
            UPDATE servers 
            SET name = ?, icon = ?, announcement = ?, level = ?
            WHERE id = ?
            "#,
            server.name,
            server.icon,
            server.announcement,
            server.level,
            server.id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Channel operations
    async fn create_channel(&self, channel: &Channel, server_id: &str) -> DbResult<()> {
        let mut tx = self.pool.begin().await?;

        sqlx::query!(
            r#"
            INSERT INTO channels (
                id, name, permission, is_lobby, is_category, 
                parent_id, server_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
            channel.id,
            channel.name,
            channel.permission,
            channel.is_lobby,
            channel.is_category,
            channel.parent_id,
            server_id // 確保設置 server_id
        )
        .execute(&mut *tx)
        .await?;

        // 其他代碼...
        tx.commit().await?;
        Ok(())
    }

    async fn get_channel(&self, id: &str) -> DbResult<Channel> {
        let channel = sqlx::query!(r#"SELECT * FROM channels WHERE id = ?"#, id)
            .fetch_one(&self.pool)
            .await?;

        let users = sqlx::query!(
            r#"SELECT user_id FROM channel_users WHERE channel_id = ?"#,
            id
        )
        .fetch_all(&self.pool)
        .await?;

        let message_ids = sqlx::query!(r#"SELECT id FROM messages WHERE channel_id = ?"#, id)
            .fetch_all(&self.pool)
            .await?;

        Ok(Channel {
            id: channel.id.expect("id is null"),
            name: channel.name,
            permission: channel.permission,
            is_lobby: channel.is_lobby,
            is_category: channel.is_category,
            user_ids: users.into_iter().map(|r| r.user_id).collect(),
            message_ids: message_ids.into_iter().filter_map(|r| r.id).collect(),
            parent_id: channel.parent_id,
        })
    }

    async fn create_message(&self, message: &Message, channel_id: &str) -> DbResult<()> {
        let message_type = match message.message_type {
            MessageType::General => "general",
            MessageType::Info => "info",
        };
        sqlx::query!(
            r#"
            INSERT INTO messages (

                id, sender_id, channel_id, content,
                timestamp, type
            )
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
            message.id,
            message.sender_id,
            channel_id,
            message.content,
            message.timestamp,
            message_type
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_message(&self, id: &str) -> DbResult<Message> {
        let row = sqlx::query!(r#"SELECT * FROM messages WHERE id = ?"#, id)
            .fetch_one(&self.pool)
            .await?;

        Ok(Message {
            id: row.id.expect("id is null"),
            sender_id: row.sender_id.expect("sender_id is null"),
            content: row.content,
            timestamp: row.timestamp,
            message_type: match row.r#type.as_str() {
                "general" => MessageType::General,
                "info" => MessageType::Info,
                _ => return Err(DbError::InvalidData("Invalid message type".into())),
            },
        })
    }

    // Server 相關操作
    async fn get_server_users(&self, server_id: &str) -> DbResult<Vec<User>> {
        let rows = sqlx::query!(
            r#"
            SELECT u.* 
            FROM users u
            JOIN server_users su ON u.id = su.user_id
            WHERE su.server_id = ?
            "#,
            server_id
        )
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(|row| {
                Ok(User {
                    id: row.id.expect("id is null"),
                    name: row.name,
                    account: row.account.expect("account is null"),
                    password: row.password.expect("password is null"),
                    gender: match row.gender.as_str() {
                        "Male" => UserGender::Male,
                        "Female" => UserGender::Female,
                        _ => return Err(DbError::InvalidData("Invalid gender".into())),
                    },

                    avatar: row.avatar,
                    level: row.level,
                    created_at: row.created_at,
                    last_login_at: row.last_login_at,
                    state: match row.state.as_str() {
                        "online" => UserState::Online,
                        "dnd" => UserState::Dnd,
                        "idle" => UserState::Idle,
                        "gn" => UserState::Gn,
                        _ => return Err(DbError::InvalidData("Invalid state".into())),
                    },
                    current_channel_id: row.current_channel_id,
                })
            })
            .collect()
    }

    async fn add_server_user(
        &self,
        server_id: &str,
        user_id: &str,
        permissions: i64,
    ) -> DbResult<()> {
        let now = chrono::Utc::now().timestamp_millis();
        sqlx::query!(
            r#"
            INSERT INTO server_users (server_id, user_id, permissions, join_date)
            VALUES (?, ?, ?, ?)
            "#,
            server_id,
            user_id,
            permissions,
            now
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn remove_server_user(&self, server_id: &str, user_id: &str) -> DbResult<()> {
        sqlx::query!(
            r#"
            DELETE FROM server_users 
            WHERE server_id = ? AND user_id = ?
            "#,
            server_id,
            user_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn add_server_application(
        &self,
        server_id: &str,
        user_id: &str,
        message: &str,
    ) -> DbResult<()> {
        sqlx::query!(
            r#"
            INSERT INTO server_applications (server_id, user_id, message)
            VALUES (?, ?, ?)
            "#,
            server_id,
            user_id,
            message
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn remove_server_application(&self, server_id: &str, user_id: &str) -> DbResult<()> {
        sqlx::query!(
            r#"
            DELETE FROM server_applications
            WHERE server_id = ? AND user_id = ?
            "#,
            server_id,
            user_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // Channel 相關操作
    async fn get_server_channels(&self, server_id: &str) -> DbResult<Vec<Channel>> {
        // 直接查詢屬於該伺服器的所有頻道
        let channels = sqlx::query!(
            r#"
            SELECT c.*, 
                   GROUP_CONCAT(cu.user_id) as user_ids,
                   GROUP_CONCAT(m.id) as message_ids
            FROM channels c
            LEFT JOIN channel_users cu ON c.id = cu.channel_id
            LEFT JOIN messages m ON c.id = m.channel_id
            WHERE c.server_id = ?
            GROUP BY c.id
            "#,
            server_id
        )
        .fetch_all(&self.pool)
        .await?;

        channels
            .into_iter()
            .map(|row| {
                Ok(Channel {
                    id: row.id.expect("id is null"),
                    name: row.name,
                    permission: row.permission,
                    is_lobby: row.is_lobby,
                    is_category: row.is_category,
                    user_ids: row
                        .user_ids
                        .map(|ids| {
                            ids.split(',')
                                .filter(|s| !s.is_empty())
                                .map(|s| s.to_string())
                                .collect()
                        })
                        .unwrap_or_default(),
                    message_ids: row
                        .message_ids
                        .map(|ids| {
                            ids.split(',')
                                .filter(|s| !s.is_empty())
                                .map(|s| s.to_string())
                                .collect()
                        })
                        .unwrap_or_default(),
                    parent_id: row.parent_id,
                })
            })
            .collect()
    }

    // Message 相關操作
    async fn get_channel_messages(&self, channel_id: &str) -> DbResult<Vec<Message>> {
        let rows = sqlx::query!(
            r#"
            SELECT * FROM messages 
            WHERE channel_id = ?
            ORDER BY timestamp DESC
            "#,
            channel_id
        )
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(|row| {
                Ok(Message {
                    id: row.id.expect("id is null"),
                    sender_id: row.sender_id.expect("sender_id is null"),
                    content: row.content,
                    timestamp: row.timestamp,
                    message_type: match row.r#type.as_str() {
                        "general" => MessageType::General,
                        "info" => MessageType::Info,
                        _ => return Err(DbError::InvalidData("Invalid message type".into())),
                    },
                })
            })
            .collect()
    }

    async fn update_channel(&self, channel: &Channel) -> DbResult<()> {
        let mut tx = self.pool.begin().await?;

        sqlx::query!(
            r#"
            UPDATE channels 
            SET name = ?, permission = ?, is_lobby = ?, 
                is_category = ?, parent_id = ?
            WHERE id = ?
            "#,
            channel.name,
            channel.permission,
            channel.is_lobby,
            channel.is_category,
            channel.parent_id,
            channel.id
        )
        .execute(&mut *tx)
        .await?;

        // Update channel users
        sqlx::query!("DELETE FROM channel_users WHERE channel_id = ?", channel.id)
            .execute(&mut *tx)
            .await?;

        for user_id in &channel.user_ids {
            sqlx::query!(
                r#"
                INSERT INTO channel_users (channel_id, user_id)
                VALUES (?, ?)
                "#,
                channel.id,
                user_id
            )
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        Ok(())
    }

    async fn delete_channel(&self, id: &str) -> DbResult<()> {
        let mut tx = self.pool.begin().await?;

        // 刪除頻道相關的所有資料
        sqlx::query!("DELETE FROM channel_users WHERE channel_id = ?", id)
            .execute(&mut *tx)
            .await?;

        sqlx::query!("DELETE FROM messages WHERE channel_id = ?", id)
            .execute(&mut *tx)
            .await?;

        sqlx::query!("DELETE FROM channels WHERE id = ?", id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(())
    }

    async fn get_channel_users(&self, channel_id: &str) -> DbResult<Vec<User>> {
        let rows = sqlx::query!(
            r#"
            SELECT u.* FROM users u
            JOIN channel_users cu ON u.id = cu.user_id
            WHERE cu.channel_id = ?
            "#,
            channel_id
        )
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter()
            .map(|row| {
                Ok(User {
                    id: row.id.expect("id is null"),
                    name: row.name,
                    account: row.account.expect("account is null"),
                    password: row.password.expect("password is null"),
                    gender: match row.gender.as_str() {
                        "Male" => UserGender::Male,
                        "Female" => UserGender::Female,
                        _ => return Err(DbError::InvalidData("Invalid gender".into())),
                    },
                    avatar: row.avatar,
                    level: row.level,
                    created_at: row.created_at,
                    last_login_at: row.last_login_at,
                    state: match row.state.as_str() {
                        "online" => UserState::Online,
                        "dnd" => UserState::Dnd,
                        "idle" => UserState::Idle,
                        "gn" => UserState::Gn,
                        _ => return Err(DbError::InvalidData("Invalid state".into())),
                    },
                    current_channel_id: row.current_channel_id,
                })
            })
            .collect()
    }
}
