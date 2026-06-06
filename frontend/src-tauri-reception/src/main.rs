// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{OpenOptions, create_dir_all};
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use std::time::SystemTime;

fn get_log_dir() -> PathBuf {
    let mut log_dir = if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local_app_data)
    } else if let Ok(user_profile) = std::env::var("USERPROFILE") {
        PathBuf::from(user_profile)
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home)
    } else {
        std::env::temp_dir()
    };
    log_dir.push("DarayyaClinicLogs");
    let _ = create_dir_all(&log_dir);
    log_dir
}

fn log_message(prefix: &str, message: &str) {
    let log_path = get_log_dir().join("startup_reception.log");
    let duration = SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_else(|_| std::time::Duration::from_secs(0));
    
    let log_line = format!("[secs: {}] [{}] {}\n", duration.as_secs(), prefix, message);
    
    if prefix == "ERROR" {
        eprint!("{}", log_line);
    } else {
        print!("{}", log_line);
    }
    
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        let _ = file.write_all(log_line.as_bytes());
    }
}

use std::net::{TcpStream, ToSocketAddrs};

fn is_ip_address(s: &str) -> bool {
    let clean = s.split(':').next().unwrap_or(s);
    clean.parse::<std::net::Ipv4Addr>().is_ok()
}

fn print_via_tcp(printer_address: &str, data: &[u8]) -> Result<(), String> {
    let clean_addr = printer_address.trim_start_matches("tcp://").trim_start_matches("TCP://");
    let host_port = if !clean_addr.contains(':') {
        format!("{}:9100", clean_addr)
    } else {
        clean_addr.to_string()
    };

    log_message("INFO", &format!("Connecting to network printer at {}", host_port));
    
    let socket_addrs = host_port.to_socket_addrs()
        .map_err(|e| format!("Invalid printer address format '{}': {}", host_port, e))?;
    
    let mut last_err = String::new();
    for addr in socket_addrs {
        log_message("INFO", &format!("Trying to connect to {}", addr));
        match TcpStream::connect_timeout(&addr, std::time::Duration::from_secs(5)) {
            Ok(mut stream) => {
                if let Err(e) = stream.write_all(data) {
                    last_err = format!("Failed to write data to printer: {}", e);
                    continue;
                }
                if let Err(e) = stream.flush() {
                    last_err = format!("Failed to flush data to printer: {}", e);
                    continue;
                }
                log_message("INFO", "Data successfully sent to network printer");
                return Ok(());
            }
            Err(e) => {
                last_err = format!("Failed to connect to printer at {}: {}", addr, e);
                log_message("WARNING", &last_err);
            }
        }
    }
    
    Err(format!("Could not print to network printer: {}", last_err))
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn log_frontend_event(level: &str, message: &str) {
    let log_path = get_log_dir().join("frontend.log");
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .unwrap_or_else(|_| std::time::Duration::from_secs(0));
    
    let log_line = format!("[secs: {}] [{}] {}\n", duration.as_secs(), level.to_uppercase(), message);
    
    if level.to_uppercase() == "ERROR" {
        eprint!("{}", log_line);
    } else {
        print!("{}", log_line);
    }
    
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        let _ = file.write_all(log_line.as_bytes());
    }
}


// دالة الطباعة الحرارية
#[tauri::command]
fn print_raw_data(printer_name: &str, data: Vec<u8>) -> Result<String, String> {
    log_message("INFO", &format!("Printing to: {}", printer_name));
    log_message("INFO", &format!("Data length: {}", data.len()));

    let raw_data = data;

    // Check if printer_name represents a TCP network printer (e.g. starts with "tcp://" or is an IP address)
    let is_tcp = printer_name.to_lowercase().starts_with("tcp://") || is_ip_address(printer_name);

    if is_tcp {
        log_message("INFO", &format!("Detected network printer. Printing via TCP to: {}", printer_name));
        return match print_via_tcp(printer_name, &raw_data) {
            Ok(_) => Ok("Print job sent successfully over network".to_string()),
            Err(e) => {
                log_message("ERROR", &e);
                Err(e)
            }
        };
    }

    // حفظ البيانات في ملف مؤقت ثم طباعتها
    use std::fs;
    use std::env;

    let temp_dir = env::temp_dir();
    let temp_file = temp_dir.join("clinic_ticket.tmp");

    // كتابة البيانات كـ raw bytes
    if let Err(e) = fs::write(&temp_file, &raw_data) {
        let err = format!("Failed to write temp file: {}", e);
        log_message("ERROR", &err);
        return Err(err);
    }

    // طباعة الملف باستخدام print command (Windows)
    #[cfg(target_os = "windows")]
    {
        match Command::new("print")
            .arg(format!("/D:{}", printer_name))
            .arg(temp_file.to_str().unwrap())
            .output() {
            Ok(output) => {
                if output.status.success() {
                    // حذف الملف المؤقت
                    let _ = fs::remove_file(&temp_file);
                    Ok("Print job sent successfully".to_string())
                } else {
                    let _ = fs::remove_file(&temp_file);
                    let err = format!("Print failed: {}", String::from_utf8_lossy(&output.stderr));
                    log_message("ERROR", &err);
                    Err(err)
                }
            }
            Err(e) => {
                let _ = fs::remove_file(&temp_file);
                let err = format!("Failed to execute print command: {}", e);
                log_message("ERROR", &err);
                Err(err)
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // للأنظمة الأخرى (Linux/macOS)
        match Command::new("lp")
            .arg("-d")
            .arg(printer_name)
            .arg(temp_file.to_str().unwrap())
            .output() {
            Ok(output) => {
                if output.status.success() {
                    let _ = fs::remove_file(&temp_file);
                    Ok("Print job sent successfully".to_string())
                } else {
                    let _ = fs::remove_file(&temp_file);
                    let err = format!("Print failed: {}", String::from_utf8_lossy(&output.stderr));
                    log_message("ERROR", &err);
                    Err(err)
                }
            }
            Err(e) => {
                let _ = fs::remove_file(&temp_file);
                let err = format!("Failed to execute print command: {}", e);
                log_message("ERROR", &err);
                Err(err)
            }
        }
    }
}

fn main() {
    let log_path = get_log_dir().join("startup_reception.log");
    log_message("INFO", "========================================");
    log_message("INFO", "Darayya Clinic Reception App starting...");
    log_message("INFO", &format!("Log file path: {:?}", log_path));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, print_raw_data, log_frontend_event])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}