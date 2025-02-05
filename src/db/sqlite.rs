use super::{Database, DbError, DbResult};
use crate::models::{channel::Channel, message::Message, server::Server, user::User};
use async_trait::async_trait;
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};

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
        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| DbError::Sqlx(e.into()))?;
        Ok(())
    }
    
    async fn create_user(&self, user: &User) -> DbResult<()> {
        sqlx::query(
            r#"
            INSERT INTO users (id, name, account, password, gender, permissions)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&user.id)
        .bind(&user.name)
        .bind(&user.account)
        .bind(&user.password)
        .bind(&user.gender)
        .bind(serde_json::to_string(&user.permissions).unwrap())
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
            account: row.account,
            password: row.password,
            gender: row.gender,
            permissions: serde_json::from_str(&row.permissions).unwrap(),
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
            account: row.account,
            password: row.password,
            gender: row.gender,
            permissions: serde_json::from_str(&row.permissions).unwrap(),
        })
    }
    
    async fn update_user(&self, user: &User) -> DbResult<()> {
        sqlx::query(
            r#"
            UPDATE users 
            SET name = ?, account = ?, password = ?, gender = ?, permissions = ?
            WHERE id = ?
            "#,
        )
        .bind(&user.name)
        .bind(&user.account)
        .bind(&user.password)
        .bind(&user.gender)
        .bind(serde_json::to_string(&user.permissions).unwrap())
        .bind(&user.id)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    async fn get_users_list(&self) -> DbResult<Vec<User>> {
        let rows = sqlx::query!(
            r#"
            SELECT * FROM users
            "#
        )
        .fetch_all(&self.pool)
        .await?;
        
        Ok(rows
            .into_iter()
            .map(|row| User {
                id: row.id.expect("id is null"),
                name: row.name,
                account: row.account,
                password: row.password,
                gender: row.gender,
                permissions: serde_json::from_str(&row.permissions).unwrap(),

            })

            .collect())
    }
    
    // Server operations
    async fn create_server(&self, server: &Server) -> DbResult<()> {
        sqlx::query(
            r#"
            INSERT INTO servers (id, name, announcement, icon, users, channels, messages)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&server.id)
        .bind(&server.name)
        .bind(&server.announcement)
        .bind(&server.icon)
        .bind(serde_json::to_string(&server.users).unwrap())
        .bind(serde_json::to_string(&server.channels).unwrap())
        .bind(serde_json::to_string(&server.messages).unwrap())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_server(&self, id: &str) -> DbResult<Server> {
        let row = sqlx::query!(
            r#"
            SELECT * FROM servers WHERE id = ?
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(Server {
            id: row.id.expect("id is null"),
            name: row.name,
            announcement: row.announcement,
            icon: row.icon,
            users: serde_json::from_str(&row.users).unwrap(),
            channels: serde_json::from_str(&row.channels).unwrap(),
            messages: serde_json::from_str(&row.messages).unwrap(),

        })
    }

    async fn update_server(&self, server: &Server) -> DbResult<()> {
        sqlx::query(
            r#"
            UPDATE servers 
            SET name = ?, announcement = ?, icon = ?, users = ?, channels = ?, messages = ?
            WHERE id = ?
            "#,
        )
        .bind(&server.name)
        .bind(&server.announcement)
        .bind(&server.icon)
        .bind(serde_json::to_string(&server.users).unwrap())
        .bind(serde_json::to_string(&server.channels).unwrap())
        .bind(serde_json::to_string(&server.messages).unwrap())
        .bind(&server.id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_servers_list(&self) -> DbResult<Vec<Server>> {
        let rows = sqlx::query!(
            r#"
            SELECT * FROM servers
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Server {
                id: row.id.expect("id is null"),
                name: row.name,
                announcement: row.announcement,
                icon: row.icon,
                users: serde_json::from_str(&row.users).unwrap(),
                channels: serde_json::from_str(&row.channels).unwrap(),
                messages: serde_json::from_str(&row.messages).unwrap(),

            })
            .collect())
    }

    // Channel operations
    async fn create_channel(&self, channel: &Channel) -> DbResult<()> {
        sqlx::query(
            r#"
            INSERT INTO channels (id, name, permission, is_lobby, is_category, users, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&channel.id)
        .bind(&channel.name)
        .bind(&channel.permission)
        .bind(channel.is_lobby)
        .bind(channel.is_category)
        .bind(serde_json::to_string(&channel.users).unwrap())
        .bind(&channel.parent_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_channel(&self, id: &str) -> DbResult<Channel> {
        let row = sqlx::query!(
            r#"
            SELECT * FROM channels WHERE id = ?
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(Channel {
            id: row.id.expect("id is null"),
            name: row.name,
            permission: row.permission,
            is_lobby: row.is_lobby,
            is_category: row.is_category,
            users: serde_json::from_str(&row.users).unwrap(),


            parent_id: row.parent_id,
        })
    }

    async fn update_channel(&self, channel: &Channel) -> DbResult<()> {
        sqlx::query(
            r#"
            UPDATE channels 
            SET name = ?, permission = ?, is_lobby = ?, is_category = ?, users = ?, parent_id = ?
            WHERE id = ?
            "#,
        )
        .bind(&channel.name)
        .bind(&channel.permission)
        .bind(channel.is_lobby)
        .bind(channel.is_category)
        .bind(serde_json::to_string(&channel.users).unwrap())
        .bind(&channel.parent_id)
        .bind(&channel.id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn delete_channel(&self, id: &str) -> DbResult<()> {
        sqlx::query(
            r#"
            DELETE FROM channels WHERE id = ?
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_channels_list(&self) -> DbResult<Vec<Channel>> {
        let rows = sqlx::query!(
            r#"
            SELECT * FROM channels
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Channel {
                id: row.id.expect("id is null"),
                name: row.name,
                permission: row.permission,
                is_lobby: row.is_lobby,
                is_category: row.is_category,
                users: serde_json::from_str(&row.users).unwrap(),
                parent_id: row.parent_id,


            })
            .collect())
    }

    // Message operations
    async fn create_message(&self, message: &Message) -> DbResult<()> {
        sqlx::query(
            r#"
            INSERT INTO messages (id, sender, content, timestamp)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(&message.id)
        .bind(&message.sender)
        .bind(&message.content)
        .bind(message.timestamp)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_message(&self, id: &str) -> DbResult<Message> {
        let row = sqlx::query!(
            r#"
            SELECT * FROM messages WHERE id = ?
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(Message {
            id: row.id.expect("id is null"),
            sender: row.sender,
            content: row.content,
            timestamp: row.timestamp,

        })

    }

    async fn get_messages_list(&self) -> DbResult<Vec<Message>> {
        let rows = sqlx::query!(
            r#"
            SELECT * FROM messages
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| Message {
                id: row.id.expect("id is null"),
                sender: row.sender,
                content: row.content,
                timestamp: row.timestamp,

            })
            .collect())
    }
} 