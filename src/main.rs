use axum::{
    routing::{patch, post},
    Router,
};
use clap::Parser;
use config as config_lib;
use db::{init_database, Database, SqliteDatabase};
use http::header::{HeaderName, HeaderValue};
use socketioxide::{
    extract::{Data, SocketRef},
    SocketIoBuilder,
};
use std::path::PathBuf;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::{error, info};

mod db;
mod handlers;
mod models;
mod my_config;

use config_lib::ConfigError;
use my_config::Settings;

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
    std::env::set_var("DATABASE_URL", settings.database.url.clone());
    let database = Arc::new(
        SqliteDatabase::new(&settings.database.url, settings.database.max_connections)
            .await
            .expect("Failed to connect to database"),
    );

    // 先執行 migrations
    info!("Running migrations...");
    database.init().await.expect("Failed to run migrations");

    // 然後再執行資料初始化
    if args.init {
        info!("Initializing database data...");
        init_database(&*database, &settings).await?;
    }

    // Socket.IO
    let (layer, io) = SocketIoBuilder::new()
        .with_state(database.clone())
        .build_layer();
    io.ns("/", |socket: SocketRef| async move {
        info!("Socket connected: {}", socket.id);

        socket.on(
            "connectServer",
            |data: Data<handlers::socket::ConnectServerData>,
             db_state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>,
             socket: SocketRef| {
                let db = db_state.0.clone();
                async move {
                    if let Err(e) =
                        handlers::socket::handle_connect_server::<SqliteDatabase>(socket, data, db)
                            .await
                    {
                        error!("Error handling connect server: {}", e);
                    }
                }
            },
        );

        socket.on(
            "connectUser",
            |data: Data<handlers::socket::ConnectUserData>,
             db_state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>,
             socket: SocketRef| async move {
                info!("connectUser: {}", socket.id);
                let db = db_state.0.clone();
                if let Err(e) =
                    handlers::socket::handle_connect_user::<SqliteDatabase>(socket, data, db).await
                {
                    error!("Error handling connect user: {}", e);
                }
            },
        );

        socket.on(
            "chatMessage",
            |data: Data<handlers::socket::ChatMessageData>,
             db_state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>,
             socket: SocketRef| async move {
                let db = db_state.0.clone();
                if let Err(e) =
                    handlers::socket::handle_chat_message::<SqliteDatabase>(socket, data, db).await
                {
                    error!("Error handling chat message: {}", e);
                }
            },
        );

        socket.on(
            "addChannel",
            |data: Data<handlers::socket::ChannelData>,
             db_state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>,
             socket: SocketRef| async move {
                let db = db_state.0.clone();
                if let Err(e) =
                    handlers::socket::handle_add_channel::<SqliteDatabase>(socket, data, db).await
                {
                    error!("Error handling add channel: {}", e);
                }
            },
        );

        socket.on(
            "editChannel",
            |data: Data<handlers::socket::ChannelData>,
             db_state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>,
             socket: SocketRef| async move {
                let db = db_state.0.clone();
                if let Err(e) =
                    handlers::socket::handle_edit_channel::<SqliteDatabase>(socket, data, db).await
                {
                    error!("Error handling edit channel: {}", e);
                }
            },
        );

        socket.on(
            "deleteChannel",
            |data: Data<handlers::socket::DeleteChannelData>,
             db_state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>,
             socket: SocketRef| async move {
                let db = db_state.0.clone();
                if let Err(e) =
                    handlers::socket::handle_delete_channel::<SqliteDatabase>(socket, data, db)
                        .await
                {
                    error!("Error handling delete channel: {}", e);
                }
            },
        );

        socket.on(
            "joinChannel",
            |data: Data<handlers::socket::JoinChannelData>,
             db_state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>,
             socket: SocketRef| async move {
                let db = db_state.0.clone();
                if let Err(e) =
                    handlers::socket::handle_join_channel::<SqliteDatabase>(socket, data, db).await
                {
                    error!("Error handling join channel: {}", e);
                }
            },
        );

        socket.on(
            "leaveChannel",
            |data: Data<handlers::socket::LeaveChannelData>,
             db_state: socketioxide::extract::State<Arc<db::sqlite::SqliteDatabase>>,
             socket: SocketRef| async move {
                let db = db_state.0.clone();
                if let Err(e) =
                    handlers::socket::handle_leave_channel::<SqliteDatabase>(socket, data, db).await
                {
                    error!("Error handling leave channel: {}", e);
                }
            },
        );

        info!("Socket handlers registered: {}", socket.id);
    });

    // CORS
    let mut cors = CorsLayer::new()
        .allow_methods(
            settings
                .cors
                .allowed_methods
                .iter()
                .map(|s| s.parse().unwrap())
                .collect::<Vec<_>>(),
        )
        .allow_credentials(settings.cors.allow_credentials);

    if settings.cors.allowed_origins.contains(&"*".to_string()) {
        cors = cors.allow_origin(tower_http::cors::Any);
    } else {
        cors = cors.allow_origin(
            settings
                .cors
                .allowed_origins
                .iter()
                .map(|s| s.parse::<HeaderValue>().unwrap())
                .collect::<Vec<HeaderValue>>(),
        );
    }

    if settings.cors.allowed_headers.contains(&"*".to_string()) {
        cors = cors.allow_headers(tower_http::cors::Any);
    } else {
        cors = cors.allow_headers(
            settings
                .cors
                .allowed_headers
                .iter()
                .map(|s| s.parse::<HeaderName>().unwrap())
                .collect::<Vec<HeaderName>>(),
        );
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
