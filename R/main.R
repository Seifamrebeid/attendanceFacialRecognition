# main.R
# Main entry point for the Smart Auto-Detection Attendance System
#
# This script orchestrates all modules and generates the Python script
# for the facial recognition attendance system.

# Determine the directory where this script is located
script_dir <- tryCatch({
  dirname(sys.frame(1)$ofile)
}, error = function(e) {
  # Fallback: assume we're in the R directory
  "."
})

# Source utility functions first
source(file.path(script_dir, "utils.R"))

# Source setup modules
source(file.path(script_dir, "setup", "config.R"))
source(file.path(script_dir, "setup", "environment_setup.R"))

# Source generator modules (simplified names)
source(file.path(script_dir, "generators", "firebase.R"))
source(file.path(script_dir, "generators", "course_selection.R"))
source(file.path(script_dir, "generators", "detection.R"))
source(file.path(script_dir, "generators", "ui.R"))
source(file.path(script_dir, "generators", "main_loop.R"))

#' Run the Smart Attendance System
#'
#' @description Main function that orchestrates the entire attendance system
#'              by generating Python modules and running the application
#' @return NULL (runs the attendance system)
#' @export
run_attendance_system <- function() {
  # Display header
  print_header()
  
  # Ensure generated folder exists
  ensure_directory(file.path(script_dir, "generated"))
  
  # Setup environment
  tryCatch({
    setup_environment()
  }, error = function(e) {
    cat(sprintf("Environment setup failed: %s\n", e$message))
    stop(e)
  })
  
  # Generate Python modules
  cat("\nGenerating Python script...\n")
  
  imports_code <- generate_imports()
  firebase_code <- generate_firebase_code()
  course_selection_code <- generate_course_selection_code()
  detection_code <- generate_detection_code()
  ui_code <- generate_ui_code()
  main_code <- generate_main_code()
  
  # Combine into single Python script
  python_script <- combine_python_modules(list(
    imports = imports_code,
    firebase = firebase_code,
    course_selection = course_selection_code,
    detection = detection_code,
    ui = ui_code,
    main = main_code
  ))
  
  # Write Python script
  write_python_module(python_script, PYTHON_SCRIPT_FILE)
  cat(sprintf("Created smart auto-detection %s\n", PYTHON_SCRIPT_FILE))
  
  # Run the Python script
  cat("Starting smart auto-detection...\n")
  run_python_script(PYTHON_SCRIPT_FILE)
  
  cat("\nSmart auto-detection completed!\n")
}

# Run the attendance system when script is executed
run_attendance_system()
