pub mod auth;
pub mod socket;
// pub mod channel;
// pub mod message;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

pub struct ApiError(pub StatusCode, pub String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.0,
            Json(json!({
                "error": self.1
            })),
        )
            .into_response()
    }
}

pub type ApiResult<T> = Result<Json<T>, ApiError>;
