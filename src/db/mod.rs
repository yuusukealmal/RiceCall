pub mod sqlite;
mod init;

pub use sqlite::*;
pub use init::*;

use crate::models::{channel::Channel, message::Message, server::Server, user::User};
use async_trait::async_trait;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("Database error: {0}")]
    Sqlx(#[from] sqlx::Error),
    #[error("Item not found")]
    NotFound,
    #[error("Duplicate entry")]
    DuplicateEntry,
}

pub type DbResult<T> = Result<T, DbError>;

#[async_trait]
pub trait Database: Send + Sync + 'static {
    async fn init(&self) -> DbResult<()>;
    
    // User operations
    async fn create_user(&self, user: &User) -> DbResult<()>;
    async fn get_user(&self, id: &str) -> DbResult<User>;
    async fn get_user_by_account(&self, account: &str) -> DbResult<User>;
    async fn get_user_by_id(&self, id: &str) -> DbResult<User>;
    async fn update_user(&self, user: &User) -> DbResult<()>;
    async fn get_users_list(&self) -> DbResult<Vec<User>>;

    // Server operations
    async fn create_server(&self, server: &Server) -> DbResult<()>;
    async fn get_server(&self, id: &str) -> DbResult<Server>;
    async fn update_server(&self, server: &Server) -> DbResult<()>;
    async fn get_servers_list(&self) -> DbResult<Vec<Server>>;
    
    // Channel operations
    async fn create_channel(&self, channel: &Channel) -> DbResult<()>;
    async fn get_channel(&self, id: &str) -> DbResult<Channel>;
    async fn update_channel(&self, channel: &Channel) -> DbResult<()>;
    async fn delete_channel(&self, id: &str) -> DbResult<()>;
    async fn get_channels_list(&self) -> DbResult<Vec<Channel>>;
    
    // Message operations
    async fn create_message(&self, message: &Message) -> DbResult<()>;
    async fn get_message(&self, id: &str) -> DbResult<Message>;
    async fn get_messages_list(&self) -> DbResult<Vec<Message>>;
} 