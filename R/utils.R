# utils.R
# Helper functions for the Smart Attendance System
#
# This module contains utility functions used across the application
# for file operations, Python code handling, and user feedback.

#' Write Python Code to File
#'
#' @description Writes Python code string to a specified file
#' @param code Character string containing Python code
#' @param filename Name of the output file
#' @return NULL (writes file and prints confirmation)
#' @export
write_python_module <- function(code, filename) {
  tryCatch({
    writeLines(code, filename)
    cat(sprintf("Created %s\n", filename))
  }, error = function(e) {
    cat(sprintf("Error writing %s: %s\n", filename, e$message))
    stop(e)
  })
}

#' Combine Python Modules into Single Script
#'
#' @description Combines multiple Python code strings into a single script
#'              with proper ordering of imports and sections
#' @param modules Named list of module strings (imports, firebase, course_selection, detection, ui, main)
#' @return Character string containing the combined Python script
#' @export
combine_python_modules <- function(modules) {
  # Combine all module strings with proper imports at the top
  combined <- paste(
    modules$imports,
    modules$firebase,
    modules$course_selection,
    modules$detection,
    modules$ui,
    modules$main,
    sep = "\n"
  )
  
  return(combined)
}

#' Check if File Exists with User-Friendly Message
#'
#' @description Checks if a file exists and provides user feedback
#' @param filepath Path to the file to check
#' @param description Human-readable description of the file
#' @return TRUE if file exists, stops execution if not
#' @export
check_file_exists <- function(filepath, description) {
  if (!file.exists(filepath)) {
    cat(sprintf("%s not found at: %s\n", description, filepath))
    stop(sprintf("%s required", description))
  }
  cat(sprintf("%s found!\n", description))
  return(TRUE)
}

#' Print System Header
#'
#' @description Prints the application header with feature information
#' @return NULL (prints to console)
#' @export
print_header <- function() {
  cat("Smart Auto-Detection Attendance System\n")
  cat("=========================================\n")
  cat("Features: AI Auto-Capture + Entry/Exit Tracking\n\n")
}

#' Print Section Header
#'
#' @description Prints a formatted section header
#' @param title Title of the section
#' @return NULL (prints to console)
#' @export
print_section <- function(title) {
  separator <- paste(rep("=", nchar(title) + 4), collapse = "")
  cat(sprintf("\n%s\n", separator))
  cat(sprintf("  %s\n", title))
  cat(sprintf("%s\n", separator))
}

#' Create Directory if Not Exists
#'
#' @description Creates a directory if it doesn't already exist
#' @param dir_path Path to the directory
#' @return TRUE if directory exists or was created
#' @export
ensure_directory <- function(dir_path) {
  if (!dir.exists(dir_path)) {
    dir.create(dir_path, recursive = TRUE)
    cat(sprintf("Created directory: %s\n", dir_path))
  }
  return(TRUE)
}

#' Generate Timestamp String
#'
#' @description Generates a formatted timestamp string for file naming
#' @param format Format string for timestamp (default: "%Y%m%d_%H%M%S")
#' @return Character string with formatted timestamp
#' @export
generate_timestamp <- function(format = "%Y%m%d_%H%M%S") {
  return(format(Sys.time(), format))
}

#' Escape String for Python
#'
#' @description Escapes special characters in a string for Python code embedding
#' @param str String to escape
#' @return Escaped string safe for Python
#' @export
escape_for_python <- function(str) {
  # Escape backslashes first, then quotes
  str <- gsub("\\\\", "\\\\\\\\", str)
  str <- gsub("'", "\\'", str, fixed = TRUE)
  str <- gsub('"', '\\"', str, fixed = TRUE)
  return(str)
}
