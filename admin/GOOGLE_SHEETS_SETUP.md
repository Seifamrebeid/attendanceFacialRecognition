# Google Sheets Integration Setup Guide

## Quick Fix for "process is not defined" Error

The error occurred because `googleapis` is a Node.js library that cannot run in the browser. The service has been updated to use the Google Sheets REST API directly, which works in client-side apps.

## Setup Instructions

### Option 1: Using Google Sheets API Key (Recommended for Public Sheets)

1. **Get a Google Sheets API Key**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the "Google Sheets API"
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy the API key

2. **Configure Environment Variable**

   - Create a `.env` file in the `admin` folder (if it doesn't exist)
   - Add the following line:
     ```
     VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here
     ```

3. **Make Sheet Publicly Accessible**

   - Open your Google Sheet
   - Click "Share" button
   - Change to "Anyone with the link" can view
   - This allows the API to read the sheet

4. **Restart Development Server**
   ```bash
   npm run dev
   ```

### Option 2: Skip Google Sheets Integration

If you don't need Google Sheets integration:

- The app will work fine without it
- Student statistics will be calculated from Firebase data only
- Leave the spreadsheet ID field empty in the UI

## Using the Feature

### In the Course Stats Page

1. Navigate to Course Stats page
2. (Optional) Enter your Google Sheet ID in the text field
3. Click "Refresh" to load data
4. Statistics will show:
   - From Firebase: All attendance data
   - From Google Sheets (if configured): Student names and emails

### Google Sheet Format

Your Google Sheet should have these columns (starting from row 2):

| A          | B        | C                | D                | E              | F   |
| ---------- | -------- | ---------------- | ---------------- | -------------- | --- |
| Student ID | Name     | Email            | Enrolled Courses | Photo Drive ID | ... |
| 12345      | John Doe | john@example.com | CS101,CS102      | drive_id_123   | ... |

- **Column A**: Student Number/ID
- **Column B**: Full Name
- **Column C**: Email Address
- **Column D**: Comma-separated course IDs/codes
- **Column E**: Google Drive photo ID (optional)

## Uninstall googleapis (Optional)

Since we're no longer using the Node.js package, you can remove it:

```bash
cd admin
npm uninstall googleapis
```

## Troubleshooting

### Error: "Failed to load course statistics"

- Check browser console for detailed error
- Verify Google Sheets API key is correct
- Ensure sheet is publicly accessible

### Error: "Google Sheets API error: 403"

- Sheet is not publicly accessible
- API key is invalid or restricted
- Sheet ID is incorrect

### Error: "No data found in sheet"

- Check sheet name is "Sheet1" (or update range in code)
- Ensure data starts from row 2 (row 1 should be headers)
- Verify spreadsheet ID is correct

### Data not enriched with names

- Google Sheets integration is optional
- Check if API key is set in `.env`
- Verify sheet ID is entered in the UI
- Check browser console for warnings

## Alternative: Backend API Approach

For production or private sheets, consider creating a backend API:

1. Create a Node.js/Express backend
2. Use `googleapis` on the server
3. Create an endpoint: `GET /api/sheets/:spreadsheetId`
4. Call this endpoint from your React app

This approach:

- ✅ Keeps credentials secure
- ✅ Works with private sheets
- ✅ Allows for service account authentication
- ✅ More secure and scalable

## Security Notes

⚠️ **API Key Security**:

- API keys in `.env` files are embedded in the client bundle
- Only use API keys with proper restrictions
- For sensitive data, use a backend API instead
- Restrict API key to:
  - Google Sheets API only
  - Specific HTTP referrers (your domain)
  - IP addresses (if applicable)

## Support

The app works perfectly fine without Google Sheets integration. All attendance statistics will still be calculated from Firebase data. Google Sheets integration is only for enriching student data with names and emails.
