# Local CSV Student Data Setup

## ✅ Setup Complete

I've configured your app to read student data from the local CSV file: `admin/public/datasdt.csv`.

## 📂 File Location

The file is located at:
`d:\New folder\attendanceFacialRecognition\admin\public\datasdt.csv`

## 📝 CSV Format

The app expects the CSV to have the following structure (based on your file):

**Column 1**: Student Name  
**Column 2**: Student ID  
**Column 3+**: (Optional) Email or Photo ID

**Example:**
```csv
"Enter Your Name...", "Student ID", ...
"John Doe", "2024001", "john@email.com", "1abc...xyz"
```

## 🔄 How to Update Data

1. **Edit the file**: Open `admin/public/datasdt.csv` in Excel or any text editor.
2. **Save**: Save your changes.
3. **Refresh**: Refresh your browser to see the updated list.

## ⚠️ Important Notes

- **Enrolled Courses**: Since your CSV doesn't seem to have course data, **all students are currently shown for all courses**.
- **Photos**: If you add a column with a Google Drive File ID (long string like `1abc...xyz`), the app will try to load the photo.
- **Emails**: If no email is found in the CSV, a fake one is generated (`ID@student.university.edu`).

## 🚀 Troubleshooting

If you don't see students:
1. Check the browser console (F12) for "Fetching students from local CSV..."
2. Ensure the file is in the `public` folder.
3. Check if the CSV format matches the expected structure.
