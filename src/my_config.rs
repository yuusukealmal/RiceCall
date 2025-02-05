use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;
use std::{env, path::PathBuf};
use crate::models::{channel::Channel, message::Message, server::Server, user::User};

#[derive(Debug, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Deserialize)]
pub struct Database {
    pub url: String
}

#[derive(Debug, Deserialize)]
pub struct Cors {
    pub allowed_origins: Vec<String>,
    pub allowed_methods: Vec<String>,
    pub allowed_headers: Vec<String>,
    pub allow_credentials: bool,
}

#[derive(Debug, Deserialize)]
pub struct InitialData {
    pub users: Vec<User>,
    pub channels: Vec<Channel>,
    pub messages: Vec<Message>,
    pub servers: Vec<Server>,
}


#[derive(Debug, Deserialize)]
pub struct Settings {
    pub server: ServerConfig,
    pub database: Database,
    pub cors: Cors,
    pub initial_data: InitialData,
}

impl Settings {
    pub fn from_file(config_path: Option<PathBuf>) -> Result<Self, ConfigError> {
        let run_mode = env::var("RUN_MODE").unwrap_or_else(|_| "development".into());

        let mut builder = Config::builder();

        // 如果指定了設定檔路徑，就使用指定的路徑
        if let Some(path) = config_path {
            if !path.exists() {
                return Err(ConfigError::NotFound(path.to_string_lossy().into()));
            }
            builder = builder.add_source(File::from(path));
        } else {
            // 否則使用預設的設定檔路徑
            builder = builder
                .add_source(File::with_name("config/default"))
                .add_source(File::with_name(&format!("config/{}", run_mode)).required(false));
        }

        // 最後讀取環境變數
        let s = builder
            .add_source(Environment::with_prefix("APP"))
            .build()?;

        Ok(s.try_deserialize()?)
    }
} 