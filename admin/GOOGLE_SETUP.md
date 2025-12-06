# Google Sheets & Drive Integration - Quick Setup

## ✅ What I've Created

I've integrated Google Sheets for student data and Google Drive for photos!

### Files Created:
1. `googleSheetsService.js` - Fetches students from Google Sheets
2. `googleDriveService.js` - Fetches photos from Google Drive  
3. Updated `studentsService.js` - Uses Google Sheets instead of Firestore
4. `GOOGLE_INTEGRATION_GUIDE.md` - Detailed setup instructions

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Install Package
```bash
npm install googleapis
```
✅ **Done automatically**

### Step 2: Enable Google APIs

1. Go to https://console.cloud.google.com
2. Create/select project
3. Enable these APIs:
   - **Google Sheets API**
   - **Google Drive API**

### Step 3: Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name: `attendance-system`
4. Role: **Editor**
5. Click **Keys** → **Add Key** → **JSON**
6. Download and save as `google-credentials.json` in `admin/` folder

### Step 4: Prepare Your Google Sheet

**Sheet Structure** (columns A-E):

| Student ID | Name | Email | Enrolled Courses | Photo Drive ID |
|------------|------|-------|------------------|----------------|
| 2024001 | John Doe | john@edu | CS101,CS201 | 1abc...xyz |

**Notes:**
- First row = headers
- Enrolled Courses = comma-separated course IDs
- Photo Drive ID = Google Drive file ID

**Share the sheet:**
- Click Share
- Add service account email (from credentials.json)
- Give Editor access

### Step 5: Configure Environment

Add to your `.env` file:

```env
VITE_GOOGLE_SHEET_ID=your_sheet_id_from_url
VITE_GOOGLE_DRIVE_FOLDER_ID=your_folder_id_from_url
```

**How to get IDs:**
- Sheet ID: From URL `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
- Folder ID: From URL `https://drive.google.com/drive/folders/FOLDER_ID`

---

## 📸 Google Drive Photos

**Setup:**
1. Create folder in Google Drive
2. Upload student photos
3. Name files: `studentId.jpg` (e.g., `2024001.jpg`)
4. Share folder with service account email
5. Get file IDs and add to Google Sheet

**Or use direct links:**
- Right-click photo → Get link → Copy file ID
- Add to "Photo Drive ID" column in sheet

---

## ⚠️ Important Notes

1. **Add to .gitignore:**
```
google-credentials.json
```

2. **Security:**
- Never commit credentials to Git
- Service account has access to shared resources only

3. **Photo URLs:**
- Photos must be shared with service account
- Or set to "Anyone with link can view"

---

## 🧪 Testing

Once configured:
1. Restart dev server: `npm run dev`
2. Go to Students page
3. You should see students from Google Sheet
4. Photos will load from Google Drive

---

## 📝 Google Sheet Example

Create a sheet like this:

```
Row 1 (Headers):
Student ID | Name | Email | Enrolled Courses | Photo Drive ID

Row 2:
2024001 | Alice Johnson | alice@edu | EBA3201 | 1a2b3c4d5e

Row 3:
2024002 | Bob Smith | bob@edu | EBA3201,CS101 | 2f3g4h5i6j
```

---

## 🎯 Next Steps

1. ✅ Install googleapis (done)
2. ⏳ Set up Google Cloud Project
3. ⏳ Create service account & download credentials
4. ⏳ Prepare Google Sheet with student data
5. ⏳ Upload photos to Google Drive
6. ⏳ Update .env with Sheet ID and Folder ID
7. ⏳ Restart server and test

**Need help with any step?** Check `GOOGLE_INTEGRATION_GUIDE.md` for detailed instructions!
