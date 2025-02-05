use super::{Database, DbResult};
use crate::my_config::Settings;

pub async fn init_database<D: Database>(db: &D, settings: &Settings) -> DbResult<()> {
    for user in &settings.initial_data.users {
        db.create_user(user).await?;
    }

    for channel in &settings.initial_data.channels {
        db.create_channel(channel).await?;
    }

    for message in &settings.initial_data.messages {
        db.create_message(message).await?;
    }

    for server in &settings.initial_data.servers {
        db.create_server(server).await?;
    }

    Ok(())
} 