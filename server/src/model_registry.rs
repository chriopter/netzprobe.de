use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPackage {
    pub id: String,
    pub domain: ModelDomain,
    pub kind: ModelKind,
}

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ModelDomain {
    Last,
    Erzeugung,
    Speicher,
    Aussenhandel,
    Presets,
    Kern,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ModelKind {
    Dataset,
    Scenario,
    Composition,
    Model,
}

#[derive(Debug, Default, Clone)]
pub struct ModelRegistry {
    packages: Vec<ModelPackage>,
}

impl ModelRegistry {
    pub fn empty() -> Self {
        Self::default()
    }

    pub fn from_packages(packages: Vec<ModelPackage>) -> Result<Self, ModelRegistryError> {
        let mut ids = BTreeSet::new();
        for package in &packages {
            if package.id.trim().is_empty() {
                return Err(ModelRegistryError::EmptyId);
            }
            if !ids.insert(package.id.clone()) {
                return Err(ModelRegistryError::DuplicateId(package.id.clone()));
            }
        }

        Ok(Self { packages })
    }

    pub fn packages(&self) -> &[ModelPackage] {
        &self.packages
    }

    pub fn is_empty(&self) -> bool {
        self.packages.is_empty()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelRegistryError {
    EmptyId,
    DuplicateId(String),
}

impl std::fmt::Display for ModelRegistryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModelRegistryError::EmptyId => f.write_str("model package id must not be empty"),
            ModelRegistryError::DuplicateId(id) => write!(f, "duplicate model package id: {id}"),
        }
    }
}

impl std::error::Error for ModelRegistryError {}

#[cfg(test)]
mod tests {
    use super::{ModelDomain, ModelKind, ModelPackage, ModelRegistry, ModelRegistryError};

    #[test]
    fn accepts_empty_registry_until_model_packages_exist() {
        let registry = ModelRegistry::empty();

        assert!(registry.is_empty());
        assert!(registry.packages().is_empty());
    }

    #[test]
    fn rejects_duplicate_ids() {
        let package = ModelPackage {
            id: "e100-pkw".to_string(),
            domain: ModelDomain::Last,
            kind: ModelKind::Scenario,
        };

        let result = ModelRegistry::from_packages(vec![package.clone(), package]);

        assert_eq!(
            result.unwrap_err(),
            ModelRegistryError::DuplicateId("e100-pkw".to_string()),
        );
    }
}
