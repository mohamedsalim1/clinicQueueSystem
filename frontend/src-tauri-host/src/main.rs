// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{OpenOptions, create_dir_all};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime};
use std::net::{TcpStream, ToSocketAddrs};
use tauri::{Manager, RunEvent};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

struct BackendProcessState {
    child: Arc<Mutex<Option<Child>>>,
}

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
    let log_path = get_log_dir().join("startup.log");
    let duration = SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_else(|_| Duration::from_secs(0));
    
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

fn clean_windows_path(path: PathBuf) -> PathBuf {
    let path_str = path.to_string_lossy().into_owned();
    if path_str.starts_with(r"\\?\") {
        PathBuf::from(&path_str[4..])
    } else {
        path
    }
}

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
        match TcpStream::connect_timeout(&addr, Duration::from_secs(5)) {
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

// دالة فحص اتصال منفذ السيرفر محلياً
fn wait_for_backend(port: u16, max_retries: u32) -> bool {
    let addr = format!("127.0.0.1:{}", port);
    for i in 0..max_retries {
        if std::net::TcpStream::connect(&addr).is_ok() {
            log_message("INFO", &format!("Connection to backend succeeded on attempt {}", i + 1));
            return true;
        }
        thread::sleep(Duration::from_millis(150));
    }
    false
}

// دالة تشغيل خادم النود الخلفي
fn spawn_backend(app: &tauri::App) -> Result<Child, String> {
    log_message("INFO", "spawn_backend called");

    let resource_dir = app.path().resource_dir()
        .map_err(|e| {
            let err = format!("Failed to get resource dir: {}", e);
            log_message("ERROR", &err);
            err
        })?;
    
    log_message("INFO", &format!("Resource directory path: {:?}", resource_dir));
    
    let is_debug = cfg!(debug_assertions);
    log_message("INFO", &format!("Is debug mode: {}", is_debug));
    
    let (index_js_path, working_dir) = if is_debug {
        let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let root = current_dir.parent().unwrap_or(&current_dir).to_path_buf();
        let js_path = root.join("src").join("index.js");
        let work_dir = root;
        (js_path, work_dir)
    } else {
        // البحث عن index.js في المسارات المتوقعة
        let path_direct = resource_dir.join("src").join("index.js");
        let path_nested = resource_dir.join("_up_").join("_up_").join("src").join("index.js");
        
        let chosen_js = if path_nested.exists() {
            log_message("INFO", &format!("Found index.js in nested path: {:?}", path_nested));
            path_nested
        } else {
            log_message("INFO", &format!("index.js nested path not found, falling back to: {:?}", path_direct));
            path_direct
        };
        
        // ضبط مجلد العمل للعملية الخلفية
        let chosen_work_dir = if chosen_js.to_string_lossy().contains("_up_") {
            let work = resource_dir.join("_up_").join("_up_");
            log_message("INFO", &format!("Setting working directory to nested root: {:?}", work));
            work
        } else {
            log_message("INFO", &format!("Setting working directory to resource dir: {:?}", resource_dir));
            resource_dir.clone()
        };
        
        (chosen_js, chosen_work_dir)
    };
    
    let index_js_path = clean_windows_path(index_js_path);
    let working_dir = clean_windows_path(working_dir);
    
    log_message("INFO", &format!("Final index.js path: {:?}", index_js_path));
    log_message("INFO", &format!("Final working directory: {:?}", working_dir));
    
    // التحقق من وجود الملفات والمجلدات
    if !index_js_path.exists() {
        let err = format!("Backend index.js does not exist at path: {:?}", index_js_path);
        log_message("ERROR", &err);
        return Err(err);
    }
    if !working_dir.exists() {
        let err = format!("Working directory does not exist at path: {:?}", working_dir);
        log_message("ERROR", &err);
        return Err(err);
    }
    
    // التحقق من تثبيت Node.js
    log_message("INFO", "Checking if Node.js is installed...");
    let mut node_check_command = Command::new("node");
    node_check_command.arg("--version");
    #[cfg(target_os = "windows")]
    node_check_command.creation_flags(CREATE_NO_WINDOW);

    match node_check_command.output() {
        Ok(output) => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            log_message("INFO", &format!("Node.js is installed. Version: {}", version));
        }
        Err(e) => {
            let err = format!(
                "Node.js was not found in the system PATH! Please ensure Node.js is installed on the machine. System error: {}",
                e
            );
            log_message("ERROR", &err);
            return Err(err);
        }
    }
    
    // تشغيل خادم نود كـ Child process وتوجيه المخرجات
    log_message("INFO", "Spawning Node backend process...");
    let mut backend_command = Command::new("node");
    backend_command
        .arg(&index_js_path)
        .current_dir(&working_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(target_os = "windows")]
    backend_command.creation_flags(CREATE_NO_WINDOW);

    let mut child = backend_command.spawn()
        .map_err(|e| {
            let err = format!("Failed to spawn Node process: {}", e);
            log_message("ERROR", &err);
            err
        })?;
        
    log_message("INFO", "Node backend process spawned successfully! Piping stdout/stderr to logger.");
    
    // تشغيل خيوط معالجة لقراءة مخرجات النود وكتابتها في سجل البداية
    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(l) = line {
                    log_message("NODE-OUT", &l);
                }
            }
        });
    }
    
    if let Some(stderr) = child.stderr.take() {
        std::thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(l) = line {
                    log_message("NODE-ERR", &l);
                }
            }
        });
    }
        
    Ok(child)
}

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

// دالة الطباعة الحرارية المباشرة
#[tauri::command]
fn print_raw_data(printer_name: &str, data: Vec<u8>) -> Result<String, String> {
    log_message("INFO", &format!("Printing to: {}", printer_name));
    log_message("INFO", &format!("Data length: {}", data.len()));

    use std::fs;
    use std::env;

    let temp_dir = env::temp_dir();
    let temp_file = temp_dir.join("clinic_ticket.tmp");

    let raw_data = data;
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

    if let Err(e) = fs::write(&temp_file, &raw_data) {
        let err = format!("Failed to write temp file: {}", e);
        log_message("ERROR", &err);
        return Err(err);
    }

    #[cfg(target_os = "windows")]
    {
        match Command::new("print")
            .arg(format!("/D:{}", printer_name))
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

    #[cfg(not(target_os = "windows"))]
    {
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
    let log_path = get_log_dir().join("startup.log");
    log_message("INFO", "========================================");
    log_message("INFO", "Darayya Clinic Host App starting...");
    log_message("INFO", &format!("Log file path: {:?}", log_path));

    let child_process = Arc::new(Mutex::new(Option::<Child>::None));
    let child_process_clone = Arc::clone(&child_process);
    
    tauri::Builder::default()
        .manage(BackendProcessState {
            child: child_process,
        })
        .setup(move |app| {
            // تشغيل خادم نود الخلفي
            match spawn_backend(app) {
                Ok(child) => {
                    let mut lock = child_process_clone.lock().unwrap();
                    *lock = Some(child);
                    log_message("INFO", "[Tauri Host] Backend process spawned successfully!");
                }
                Err(e) => {
                    log_message("ERROR", &format!("[Tauri Host] Error spawning backend process: {}", e));
                }
            }
            
            // تهيئة النافذة والانتظار حتى يصبح السيرفر جاهزاً
            let is_debug = cfg!(debug_assertions);
            let main_window = app.get_webview_window("main").unwrap();
            let main_window_clone = main_window.clone();
            
            thread::spawn(move || {
                log_message("INFO", "Starting wait_for_backend loop (port 3000)...");
                if is_debug {
                    // في بيئة التطوير ننتظر الخلفية فقط ولكن نعرض منفذ الفيت 5173
                    if wait_for_backend(3000, 100) {
                        log_message("INFO", "[Tauri Host] Backend is listening on port 3000!");
                    } else {
                        log_message("WARNING", "[Tauri Host] Backend port 3000 did not respond in development!");
                    }
                    main_window_clone.show().unwrap();
                } else {
                    // في الإنتاج ننتظر المنفذ 3000 ثم نظهر النافذة لتستمر في عرض الملفات المحلية عبر بروتوكول Tauri وتفعيل الـ APIs
                    if wait_for_backend(3000, 150) {
                        log_message("INFO", "Backend port 3000 responded, showing main window...");
                    } else {
                        log_message("ERROR", "Failed to connect to backend server on port 3000 after 150 retries! Showing window anyway.");
                    }
                    if let Err(e) = main_window_clone.show() {
                        log_message("ERROR", &format!("Failed showing main window: {}", e));
                    }
                    log_message("INFO", "Main window visible.");
                }
            });
            
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, print_raw_data, log_frontend_event])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |app_handle, event| {
            if let RunEvent::Exit = event {
                // إيقاف سيرفر نود الخلفي عند إغلاق التطبيق
                let state = app_handle.state::<BackendProcessState>();
                let mut lock = state.child.lock().unwrap();
                if let Some(mut child) = lock.take() {
                    log_message("INFO", "[Tauri Host] Terminating backend process...");
                    let _ = child.kill();
                }
            }
        });
}
