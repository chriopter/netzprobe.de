pub const E100_DEMAND_MODULES: [&str; 10] = [
    "e100-pkw",
    "e100-lkw",
    "e100-bahn",
    "e100-schiff",
    "e100-flug",
    "e100-heiz",
    "e100-ghd",
    "e100-industrie-waerme",
    "e100-stahl",
    "e100-chemie",
];

pub fn demand_modules() -> &'static [&'static str; 10] {
    &E100_DEMAND_MODULES
}
