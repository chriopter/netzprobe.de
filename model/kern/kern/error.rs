#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelError {
    Unsupported { message: String },
    Data { message: String },
}

impl ModelError {
    pub fn is_not_implemented(&self) -> bool {
        false
    }
}

impl std::fmt::Display for ModelError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModelError::Unsupported { message } | ModelError::Data { message } => {
                f.write_str(message)
            }
        }
    }
}

impl std::error::Error for ModelError {}
