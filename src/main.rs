use socketioxide::{
    extract::{Data, SocketRef},
    SocketIoBuilder,
};
use axum::{
    routing::{post, patch},
    Router,
};
use tower_http::cors::CorsLayer;
use tracing::{info, error};
use db::{Database, SqliteDatabase, init_database};
use std::sync::Arc;
use std::path::PathBuf;
use clap::Parser;
use config as config_lib;
use http::header::{HeaderName, HeaderValue};

mod models;
mod handlers;
mod db;
mod my_config;

use my_config::Settings;
use config_lib::ConfigError;

/// Chat server application
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]

struct Args {
    /// Config file path
    #[arg(short = 'c', long = "config")]
    config: Option<PathBuf>,

    /// Initialize database
    #[arg(long = "init", action = clap::ArgAction::SetTrue)]
    init: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Logger
    tracing_subscriber::fmt::init();

    // Arg Parser
    let args = Args::parse();

    // Load Config
    let settings = match Settings::from_file(args.config) {
        Ok(settings) => settings,
        Err(ConfigError::NotFound(path)) => {
            error!("Config file not found: {}", path);
            std::process::exit(1);
        }

        Err(e) => {
            error!("Failed to load settings: {}", e);
            std::process::exit(1);
        }
    };

    // DB
    let database = Arc::new(
        SqliteDatabase::new(&settings.database.url)
            .await
            .expect("Failed to connect to database"),
    );

    database.init().await.expect("Failed to initialize database");

    // 只在有 --init 參數時執行資料初始化
    if args.init {
        init_database(&*database, &settings).await?;
    }

    // Socket.IO
    let (layer, io) = SocketIoBuilder::new().with_state(database.clone()).build_layer();
    io.ns("/", move |socket: SocketRef| {
        async move {
            info!("Socket connected: {}", socket.id);

            socket.on("connectServer", move |data: Data<handlers::socket::ConnectServerData>, state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>, socket: SocketRef| async move {
                let _db = state.clone();
                if let Err(e) = handlers::socket::handle_connect_server(socket, data, socketioxide::extract::State(_db)).await {
                    error!("Error handling connect server: {}", e);
                }
            });

            socket.on("chatMessage", move |data: Data<handlers::socket::ChatMessageData>, state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>, socket: SocketRef| async move {
                let _db = state.clone();
                if let Err(e) = handlers::socket::handle_chat_message(socket, data, socketioxide::extract::State(_db)).await {
                    error!("Error handling chat message: {}", e);
                }
            });

            socket.on("addChannel", move |data: Data<handlers::socket::ChannelData>, state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>, socket: SocketRef| async move {
                let _db = state.clone();
                if let Err(e) = handlers::socket::handle_add_channel(socket, data, socketioxide::extract::State(_db)).await {
                    error!("Error handling add channel: {}", e);
                }
            }); 


            socket.on("editChannel", move |data: Data<handlers::socket::ChannelData>, state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>, socket: SocketRef| async move {
                let _db = state.clone();
                if let Err(e) = handlers::socket::handle_edit_channel(socket, data, socketioxide::extract::State(_db)).await {
                    error!("Error handling edit channel: {}", e);
                }
            }); 

            socket.on("deleteChannel", move |data: Data<handlers::socket::DeleteChannelData>, state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>, socket: SocketRef| async move {
                let _db = state.clone();
                if let Err(e) = handlers::socket::handle_delete_channel(socket, data, socketioxide::extract::State(_db)).await {
                    error!("Error handling delete channel: {}", e);
                }
            });

        }
    });

    // CORS
    let mut cors = CorsLayer::new()
        .allow_methods(settings.cors.allowed_methods.iter().map(|s| s.parse().unwrap()).collect::<Vec<_>>())
        .allow_credentials(settings.cors.allow_credentials);

    if settings.cors.allowed_origins.contains(&"*".to_string()) {
        cors = cors.allow_origin(tower_http::cors::Any);
    } else {
        cors = cors.allow_origin(settings.cors.allowed_origins.iter()
            .map(|s| s.parse::<HeaderValue>().unwrap())
            .collect::<Vec<HeaderValue>>());
    }

    if settings.cors.allowed_headers.contains(&"*".to_string()) {
        cors = cors.allow_headers(tower_http::cors::Any);
    } else {
        cors = cors.allow_headers(settings.cors.allowed_headers.iter()
            .map(|s| s.parse::<HeaderName>().unwrap())
            .collect::<Vec<HeaderName>>());
    }

    // HTTP Handler
    let app = Router::new()
        .route("/login", post(handlers::auth::handle_login))
        .route("/register", post(handlers::auth::handle_register))
        .route("/userData", patch(handlers::auth::handle_update_user))
        .layer(cors)
        .layer(layer)
        .with_state(database);

    // Server
    let addr = format!("{}:{}", settings.server.host, settings.server.port);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    info!("Server running on {}", addr);
    axum::serve(listener, app).await.unwrap();

    Ok(())
} 