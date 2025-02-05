use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    pub account: Option<String>,
    #[serde(skip_serializing)]
    pub password: Option<String>,
    pub gender: Option<String>,
    pub permissions: HashMap<String, i32>,
}

impl User {
    pub fn new(name: String, account: Option<String>, password: Option<String>, gender: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            account,
            password,
            gender,
            permissions: HashMap::new(),
        }
    }
} 