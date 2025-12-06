# Google Sheets Integration - Fixed Architecture

## ❌ Problem

The `googleapis` package is a **Node.js library** and cannot run in the browser. This causes the error:
```
ReferenceError: process is not defined
```

## ✅ Solution

Use **Firebase Cloud Functions** (server-side) to handle Google Sheets operations, then call them from your React app.

---

## 🏗️ New Architecture

```
React App (Browser)
    ↓ HTTP Request
Firebase Cloud Function (Node.js)
    ↓ googleapis
Google Sheets API
```

---

## 📝 Setup Steps

### 1. Update Firebase Functions

The Cloud Function is already created in `functions/googleSheets.js`

### 2. Configure Google Credentials

```bash
cd functions
npm install googleapis

# Set Firebase config (replace with your values)
firebase functions:config:set google.sheet_id="YOUR_GOOGLE_SHEET_ID"
firebase functions:config:set google.client_email="service-account@project.iam.gserviceaccount.com"
firebase functions:config:set google.private_key="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Get these values from your `google-credentials.json` file**

### 3. Update functions/index.js

Add this line to import the Google Sheets function:

```javascript
const googleSheets = require('./googleSheets');
exports.getStudents = googleSheets.getStudents;
```

### 4. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

### 5. Update .env

Add your Cloud Functions URL:

```env
VITE_FIREBASE_FUNCTIONS_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net
```

Replace `YOUR_PROJECT_ID` with your Firebase project ID.

---

## 🧪 Testing

1. Deploy the function
2. Test the endpoint:
```bash
curl https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getStudents
```

3. If it works, your React app will automatically fetch students!

---

## 📊 Google Sheet Format

Your sheet should look like this:

| Student ID | Name | Email | Enrolled Courses | Photo Drive ID |
|------------|------|-------|------------------|----------------|
| 2024001 | John Doe | john@edu | EBA3201,CS101 | 1abc...xyz |
| 2024002 | Jane Smith | jane@edu | EBA3201 | 2def...uvw |

**Column A**: Student ID  
**Column B**: Name  
**Column C**: Email  
**Column D**: Enrolled Courses (comma-separated)  
**Column E**: Google Drive Photo ID  

---

## 🔒 Security

- Service account credentials are stored in Firebase Functions config (secure)
- Not exposed to browser
- CORS enabled for your domain

---

## ⚡ Quick Fix (For Now)

If you want to test immediately without Google Sheets, I can create a mock data version that returns sample students. Would you like that?
