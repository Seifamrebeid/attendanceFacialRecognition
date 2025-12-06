# ✅ Google Sheets Integration - Simple CSV Method

## How It Works

Your React app reads students directly from a **published Google Sheets CSV** - no backend needed!

---

## 📝 Setup Steps (2 minutes)

### Step 1: Prepare Your Google Sheet

Your sheet should have these columns (Row 1 = headers):

| Student ID | Name | Email | Enrolled Courses | Photo Drive ID |
|------------|------|-------|------------------|----------------|
| 2024001 | John Doe | john@edu | EBA3201,CS101 | 1abc...xyz |
| 2024002 | Jane Smith | jane@edu | EBA3201 | 2def...uvw |

**Column A**: Student ID  
**Column B**: Name  
**Column C**: Email  
**Column D**: Enrolled Courses (comma-separated course IDs)  
**Column E**: Google Drive Photo ID (optional)

### Step 2: Publish Your Sheet as CSV

1. Open your Google Sheet
2. Click **File** → **Share** → **Publish to web**
3. Choose:
   - **Sheet**: Select the sheet with student data
   - **Format**: CSV
4. Click **Publish**
5. Copy the URL (looks like: `https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0`)

### Step 3: Add URL to .env

Edit your `.env` file and add:

```env
VITE_GOOGLE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0
```

Replace with your actual published CSV URL.

### Step 4: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

---

## ✅ That's It!

Now your app will:
- ✅ Read students from Google Sheets
- ✅ Update automatically when you edit the sheet
- ✅ Load photos from Google Drive (if you add Drive IDs)
- ✅ Work in the browser (no backend needed)

---

## 📸 Google Drive Photos (Optional)

To add student photos:

1. Upload photos to Google Drive
2. Right-click photo → **Get link** → **Copy link**
3. Extract the file ID from the URL:
   - URL: `https://drive.google.com/file/d/1abc...xyz/view`
   - File ID: `1abc...xyz`
4. Add the file ID to column E in your sheet
5. Make sure photos are set to "Anyone with the link can view"

---

## 🔄 Updating Student Data

Just edit your Google Sheet! Changes appear in the app after refresh (or wait ~5 minutes for cache to clear).

---

## 🧪 Testing

1. Refresh your browser
2. Go to Students page
3. Open console (F12)
4. You should see: `✅ Fetched X students from Google Sheets`

---

## ⚠️ Troubleshooting

**"0 students fetched"**
- Check if CSV URL is correct in `.env`
- Make sure sheet is published to web
- Check browser console for errors

**"CORS error"**
- Google Sheets CSV exports allow CORS by default
- If you see this, the URL might be wrong

**"Students not showing"**
- Check sheet format (columns A-E)
- Make sure row 1 has headers
- Data starts from row 2

---

## 📋 Example Google Sheet

Create a sheet exactly like this:

```
Row 1: Student ID | Name | Email | Enrolled Courses | Photo Drive ID
Row 2: 2024001 | Alice Johnson | alice@university.edu | EBA3201 | 1a2b3c4d5e
Row 3: 2024002 | Bob Smith | bob@university.edu | EBA3201,CS101 | 2f3g4h5i6j
```

Then publish it and you're done! 🎉
