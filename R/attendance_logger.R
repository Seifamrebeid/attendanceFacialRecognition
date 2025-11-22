# attendance_logger.R
# Enhanced attendance logging functionality

library(dplyr)
library(lubridate)
library(here)

# Function to log attendance
log_attendance <- function(person_name, similarity_score, log_file = "attendance_log.csv") {
  timestamp <- Sys.time()
  
  # Create attendance record
  new_record <- data.frame(
    name = person_name,
    timestamp = timestamp,
    date = as.Date(timestamp),
    time = format(timestamp, "%H:%M:%S"),
    similarity_score = round(similarity_score, 3),
    status = if(similarity_score >= 0.45) "Recognized" else "Unknown",
    stringsAsFactors = FALSE
  )
  
  # Check if log file exists
  if (file.exists(log_file)) {
    existing_log <- read.csv(log_file, stringsAsFactors = FALSE)
    existing_log$timestamp <- as.POSIXct(existing_log$timestamp)
    
    # Check for duplicate entries (same person within 30 seconds)
    recent_entries <- existing_log %>%
      filter(name == person_name, 
             timestamp > (timestamp - 30)) %>%
      nrow()
    
    if (recent_entries > 0) {
      cat("Duplicate entry detected for", person_name, "within 30 seconds. Skipping.\n")
      return(FALSE)
    }
    
    # Append to existing log
    updated_log <- rbind(existing_log, new_record)
  } else {
    updated_log <- new_record
  }
  
  # Save updated log
  write.csv(updated_log, log_file, row.names = FALSE)
  
  cat("✓ Logged attendance:", person_name, "at", format(timestamp, "%H:%M:%S"), 
      "with similarity", round(similarity_score, 3), "\n")
  
  return(TRUE)
}

# Function to generate daily attendance report
generate_daily_report <- function(date = Sys.Date(), log_file = "attendance_log.csv") {
  if (!file.exists(log_file)) {
    cat("No attendance log file found.\n")
    return(NULL)
  }
  
  # Read and filter log
  log_data <- read.csv(log_file, stringsAsFactors = FALSE)
  log_data$date <- as.Date(log_data$timestamp)
  
  daily_data <- log_data %>%
    filter(date == !!date, status == "Recognized") %>%
    group_by(name) %>%
    summarise(
      first_entry = min(time),
      last_entry = max(time),
      total_entries = n(),
      avg_similarity = mean(similarity_score),
      .groups = "drop"
    ) %>%
    arrange(first_entry)
  
  # Create report
  report_file <- paste0("daily_report_", format(date, "%Y%m%d"), ".csv")
  write.csv(daily_data, report_file, row.names = FALSE)
  
  cat("\nDaily Attendance Report for", format(date, "%Y-%m-%d"), "\n")
  cat("=====================================\n")
  print(daily_data)
  cat("\nReport saved to:", report_file, "\n")
  
  return(daily_data)
}

# Function to get attendance summary
get_attendance_summary <- function(log_file = "attendance_log.csv") {
  if (!file.exists(log_file)) {
    cat("No attendance log file found.\n")
    return(NULL)
  }
  
  log_data <- read.csv(log_file, stringsAsFactors = FALSE)
  log_data$timestamp <- as.POSIXct(log_data$timestamp)
  log_data$date <- as.Date(log_data$timestamp)
  
  summary_stats <- log_data %>%
    filter(status == "Recognized") %>%
    group_by(name) %>%
    summarise(
      total_days = n_distinct(date),
      total_entries = n(),
      first_seen = min(date),
      last_seen = max(date),
      avg_similarity = mean(similarity_score),
      .groups = "drop"
    ) %>%
    arrange(desc(total_entries))
  
  cat("\nAttendance Summary\n")
  cat("=================\n")
  print(summary_stats)
  
  return(summary_stats)
}

# Function to export monthly report
export_monthly_report <- function(year = year(Sys.Date()), month = month(Sys.Date()), 
                                 log_file = "attendance_log.csv") {
  if (!file.exists(log_file)) {
    cat("No attendance log file found.\n")
    return(NULL)
  }
  
  log_data <- read.csv(log_file, stringsAsFactors = FALSE)
  log_data$timestamp <- as.POSIXct(log_data$timestamp)
  log_data$date <- as.Date(log_data$timestamp)
  log_data$year <- year(log_data$timestamp)
  log_data$month <- month(log_data$timestamp)
  
  monthly_data <- log_data %>%
    filter(year == !!year, month == !!month, status == "Recognized") %>%
    group_by(name, date) %>%
    summarise(
      entries = n(),
      first_time = min(format(timestamp, "%H:%M:%S")),
      last_time = max(format(timestamp, "%H:%M:%S")),
      .groups = "drop"
    ) %>%
    arrange(name, date)
  
  report_file <- paste0("monthly_report_", year, "_", sprintf("%02d", month), ".csv")
  write.csv(monthly_data, report_file, row.names = FALSE)
  
  cat("Monthly report exported to:", report_file, "\n")
  return(monthly_data)
}

cat("Attendance logging functions loaded!\n")
cat("Available functions:\n")
cat("- log_attendance(name, similarity)\n")
cat("- generate_daily_report(date)\n")
cat("- get_attendance_summary()\n")
cat("- export_monthly_report(year, month)\n")