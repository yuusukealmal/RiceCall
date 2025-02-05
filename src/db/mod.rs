mod init;
pub mod sqlite;

pub use init::*;
pub use sqlite::*;

use crate::models::{channel::Channel, message::Message, server::Server, user::User};
use async_trait::async_trait;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("SQLx error: {0}")]
    Sqlx(#[from] sqlx::Error),
    #[error("Invalid data: {0}")]
    InvalidData(String),
    #[error("Item not found")]
    NotFound,
}

pub type DbResult<T> = Result<T, DbError>;

#[async_trait]
pub trait Database: Send + Sync {
    async fn init(&self) -> DbResult<()>;

    // User operations
    async fn create_user(&self, user: &User) -> DbResult<()>;
    async fn get_user(&self, id: &str) -> DbResult<User>;
    async fn get_user_by_account(&self, account: &str) -> DbResult<User>;
    async fn update_user(&self, user: &User) -> DbResult<()>;
    async fn get_users_list(&self) -> DbResult<Vec<User>>;

    // Server operations
    async fn create_server(&self, server: &Server) -> DbResult<()>;
    async fn get_server(&self, id: &str) -> DbResult<Server>;
    async fn update_server(&self, server: &Server) -> DbResult<()>;
    async fn get_server_users(&self, server_id: &str) -> DbResult<Vec<User>>;
    async fn add_server_user(
        &self,
        server_id: &str,
        user_id: &str,
        permissions: i64,
    ) -> DbResult<()>;
    async fn remove_server_user(&self, server_id: &str, user_id: &str) -> DbResult<()>;
    async fn add_server_application(
        &self,
        server_id: &str,
        user_id: &str,
        message: &str,
    ) -> DbResult<()>;
    async fn remove_server_application(&self, server_id: &str, user_id: &str) -> DbResult<()>;

    // Channel operations
    async fn create_channel(&self, channel: &Channel, server_id: &str) -> DbResult<()>;
    async fn get_channel(&self, id: &str) -> DbResult<Channel>;
    async fn update_channel(&self, channel: &Channel) -> DbResult<()>;
    async fn delete_channel(&self, id: &str) -> DbResult<()>;
    async fn get_server_channels(&self, server_id: &str) -> DbResult<Vec<Channel>>;

    // Message operations
    async fn create_message(&self, message: &Message, channel_id: &str) -> DbResult<()>;
    async fn get_message(&self, id: &str) -> DbResult<Message>;
    async fn get_channel_messages(&self, channel_id: &str) -> DbResult<Vec<Message>>;

    async fn get_channel_users(&self, channel_id: &str) -> DbResult<Vec<User>>;
}
