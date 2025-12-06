# Google Sheets & Drive Integration Guide

## Overview

This guide explains how to integrate Google Sheets for student data and Google Drive for student photos in your attendance system.

## Prerequisites

1. Google Cloud Project
2. Google Sheets API enabled
3. Google Drive API enabled
4. Service Account credentials

---

## Setup Steps

### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable APIs:
   - Google Sheets API
   - Google Drive API

### 2. Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name it: `attendance-system`
4. Click **Create and Continue**
5. Grant role: **Editor**
6. Click **Done**

### 3. Generate Credentials

1. Click on the service account you created
2. Go to **Keys** tab
3. Click **Add Key** → **Create New Key**
4. Choose **JSON**
5. Download the JSON file
6. Save it as `google-credentials.json` in your project

### 4. Share Google Sheet

1. Open your Google Sheet with student data
2. Click **Share**
3. Add the service account email (from credentials JSON)
4. Give **Editor** access

### 5. Share Google Drive Folder

1. Create a folder in Google Drive for student photos
2. Share it with the service account email
3. Give **Editor** access
4. Copy the folder ID from the URL

---

## Google Sheet Structure

Your Google Sheet should have these columns:

| Student ID | Name | Email | Enrolled Courses | Photo Drive ID |
|------------|------|-------|------------------|----------------|
| 2024001 | John Doe | john@university.edu | CS101,CS201 | 1abc...xyz |
| 2024002 | Jane Smith | jane@university.edu | CS101 | 2def...uvw |

**Notes:**
- Enrolled Courses: Comma-separated course IDs
- Photo Drive ID: Google Drive file ID for student photo

---

## Installation

```bash
npm install googleapis
```

---

## Environment Variables

Add to your `.env` file:

```env
# Google Sheets
VITE_GOOGLE_SHEET_ID=your_sheet_id_here
VITE_GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here

# Path to credentials file
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
```

---

## Implementation Files

I'll create:
1. `googleSheetsService.js` - Fetch students from Google Sheets
2. `googleDriveService.js` - Fetch photos from Google Drive
3. Updated `studentsService.js` - Use Google Sheets instead of Firestore

---

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `google-credentials.json` to Git
- Add it to `.gitignore`
- For production, use environment variables for credentials
- Service account has access to your Google resources

---

## Next Steps

1. Set up Google Cloud Project
2. Download credentials
3. Share Sheet and Drive folder
4. Install googleapis package
5. I'll create the integration code

**Ready to proceed?** Let me know when you have:
- ✅ Google Sheet ID
- ✅ Google Drive Folder ID
- ✅ Service account credentials downloaded
