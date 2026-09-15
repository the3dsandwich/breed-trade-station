fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Could not start Breed Trade Station");
}
