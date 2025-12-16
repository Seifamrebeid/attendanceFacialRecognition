# environment_setup.R
# Conda/Python environment setup for the Smart Attendance System
#
# This module handles checking prerequisites and setting up the
# Python environment required for face recognition.

#' Setup Python Environment
#'
#' @description Main function to setup and verify the Python environment
#'              Checks for required files and installs necessary packages
#' @return TRUE if setup successful, stops on error
#' @export
setup_environment <- function() {
  cat("Setting up environment...\n")
  
  # Check for face encodings file
  check_face_encodings()
  
  # Install required Python packages
  install_python_packages()
  
  cat("Environment setup complete!\n")
  return(TRUE)
}

#' Check Face Encodings File
#'
#' @description Verifies that face encodings file exists
#' @return TRUE if file exists, stops execution if not
#' @export
check_face_encodings <- function() {
  if (!file.exists(FACE_ENCODINGS_FILE)) {
    cat(sprintf("Face encodings not found at: %s\n", FACE_ENCODINGS_FILE))
    cat("Run quick_setup.R first to create face encodings.\n")
    stop("Face encodings required")
  }
  cat("Face encodings found!\n")
  return(TRUE)
}

#' Install Required Python Packages
#'
#' @description Installs required Python packages via conda
#' @return NULL (packages installed silently)
#' @export
install_python_packages <- function() {
  cat("Installing required Python packages...\n")
  
  # Get conda path
  conda_path <- tryCatch({
    # Try to find conda in common locations
    if (file.exists("C:/Users/boudy/miniconda3/Scripts/conda.exe")) {
      "C:/Users/boudy/miniconda3/Scripts/conda.exe"
    } else {
      "conda"  # Fallback to system PATH
    }
  }, error = function(e) "conda")
  
  # Install pandas and firebase-admin for data handling and cloud sync
  result <- system2(
    conda_path,
    args = c("run", "-n", CONDA_ENV_NAME, "pip", "install", 
             "pandas", "firebase-admin"),
    stdout = FALSE,
    stderr = FALSE
  )
  
  if (result != 0) {
    cat("Warning: Some packages may not have installed correctly.\n")
    cat("You may need to install them manually:\n")
    cat("  conda activate ", CONDA_ENV_NAME, "\n", sep = "")
    cat("  pip install pandas firebase-admin\n")
  }
  
  return(invisible(NULL))
}

#' Check Conda Environment Exists
#'
#' @description Checks if the specified conda environment exists
#' @return TRUE if environment exists
#' @export
check_conda_environment <- function() {
  # Get conda path
  conda_path <- tryCatch({
    if (file.exists("C:/Users/boudy/miniconda3/Scripts/conda.exe")) {
      "C:/Users/boudy/miniconda3/Scripts/conda.exe"
    } else {
      "conda"
    }
  }, error = function(e) "conda")
  
  result <- system2(
    conda_path,
    args = c("env", "list"),
    stdout = TRUE,
    stderr = TRUE
  )
  
  env_exists <- any(grepl(CONDA_ENV_NAME, result))
  
  if (!env_exists) {
    cat(sprintf("Conda environment '%s' not found.\n", CONDA_ENV_NAME))
    cat("Please create it with:\n")
    cat(sprintf("  conda create -n %s python=3.9\n", CONDA_ENV_NAME))
    stop("Conda environment required")
  }
  
  cat(sprintf("Conda environment '%s' found!\n", CONDA_ENV_NAME))
  return(TRUE)
}

#' Verify System Requirements
#'
#' @description Performs a comprehensive system check
#' @return TRUE if all requirements met
#' @export
verify_system_requirements <- function() {
  cat("Verifying system requirements...\n")
  
  # Check conda is available
  conda_check <- system2("conda", args = "--version", stdout = TRUE, stderr = TRUE)
  if (length(conda_check) == 0 || !grepl("conda", conda_check[1])) {
    cat("Conda not found. Please install Anaconda or Miniconda.\n")
    stop("Conda required")
  }
  cat(sprintf("Found: %s\n", conda_check[1]))
  
  # Check conda environment
  check_conda_environment()
  
  # Check face encodings
  check_face_encodings()
  
  cat("All system requirements verified!\n")
  return(TRUE)
}

#' Run Python Script
#'
#' @description Runs a Python script using the conda environment
#' @param script_path Path to the Python script
#' @return Exit code from Python execution
#' @export
run_python_script <- function(script_path) {
  cat(sprintf("Running Python script: %s\n", script_path))
  
  # Get conda path
  conda_path <- tryCatch({
    if (file.exists("C:/Users/boudy/miniconda3/Scripts/conda.exe")) {
      "C:/Users/boudy/miniconda3/Scripts/conda.exe"
    } else {
      "conda"
    }
  }, error = function(e) "conda")
  
  result <- system2(
    conda_path,
    args = c("run", "-n", CONDA_ENV_NAME, "python", script_path)
  )
  
  return(result)
}
