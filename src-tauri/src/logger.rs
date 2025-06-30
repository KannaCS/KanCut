use std::io::Write;
use std::fs::{self, File, OpenOptions};
use std::path::Path;
use std::sync::Once;
use chrono::Local;
use log::{LevelFilter, debug, error, info, warn};
use env_logger::Builder;

static INIT: Once = Once::new();
static LOG_DIR: &str = "logs";
static LOG_FILE: &str = "kancut.log";

/// Initialize the application logger with file and console output
pub fn init() {
    INIT.call_once(|| {
        // Create logs directory if it doesn't exist
        let log_dir = Path::new(LOG_DIR);
        if !log_dir.exists() {
            if let Err(e) = fs::create_dir_all(log_dir) {
                eprintln!("Failed to create log directory: {}", e);
                return;
            }
        }

        // Configure log file path
        let log_path = log_dir.join(LOG_FILE);
        
        // Open log file with append mode
        let file = match OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path) {
                Ok(file) => file,
                Err(e) => {
                    eprintln!("Failed to open log file: {}", e);
                    return;
                }
            };

        // Configure logger
        let mut builder = Builder::new();
        builder
            .format(|buf, record| {
                writeln!(
                    buf,
                    "{} [{}] - {}: {}",
                    Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
                    record.level(),
                    record.target(),
                    record.args()
                )
            })
            .filter(None, LevelFilter::Info); // Set default log level

        // Check debug mode
        #[cfg(debug_assertions)]
        builder.filter(None, LevelFilter::Debug);

        // Set up dual logging to console and file
        builder.target(env_logger::Target::Pipe(Box::new(DualWriter {
            console: std::io::stderr(),
            file,
        })));

        // Initialize the logger
        if let Err(e) = builder.try_init() {
            eprintln!("Failed to initialize logger: {}", e);
        } else {
            info!("Logger initialized");
        }
    });
}

/// Helper function to log performance metrics
pub fn log_performance(operation: &str, duration_ms: f64) {
    debug!("Performance: {} took {:.2}ms", operation, duration_ms);
}

/// Helper function to log application errors
pub fn log_error(context: &str, error: &str) {
    error!("[{}] {}", context, error);
}

/// Dual writer to output logs to both console and file
struct DualWriter {
    console: std::io::Stderr,
    file: File,
}

impl Write for DualWriter {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        // Write to console first
        let console_result = self.console.write(buf);
        
        // Then write to file
        match self.file.write(buf) {
            Ok(file_size) => {
                // Return the console result if successful, or file size otherwise
                console_result.or(Ok(file_size))
            }
            Err(e) => {
                // If writing to file fails, log to console and return console result
                let _ = writeln!(self.console, "Failed to write to log file: {}", e);
                console_result
            }
        }
    }

    fn flush(&mut self) -> std::io::Result<()> {
        let console_result = self.console.flush();
        let file_result = self.file.flush();
        
        // Return error if either flush fails
        console_result.and(file_result)
    }
} 