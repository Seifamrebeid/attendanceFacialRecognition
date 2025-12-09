# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Configure Firebase

1. Open `config/firebase.js`
2. Replace the placeholder values with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY", // Replace this
  authDomain: "YOUR_PROJECT.firebaseapp.com", // Replace this
  projectId: "YOUR_PROJECT_ID", // Replace this
  storageBucket: "YOUR_PROJECT.appspot.com", // Replace this
  messagingSenderId: "123456789", // Replace this
  appId: "YOUR_APP_ID", // Replace this
};
```

**Where to find these?**

- Go to [Firebase Console](https://console.firebase.google.com)
- Select your project (or create one)
- Click the gear icon → Project Settings
- Scroll down to "Your apps"
- Copy the config values

### Step 2: Set Up Firebase

1. **Enable Authentication**:

   - Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password"
   - Add a test user (or use existing admin credentials)

2. **Create Firestore Database**:

   - Firebase Console → Firestore Database → Create database
   - Start in "Production mode"
   - Choose a location

3. **Update Firestore Rules** (for testing):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 3: Run the App

```bash
# Make sure you're in the doctorApp directory
cd doctorApp

# Start Expo
npm start
```

Then:

- **Android**: Press `a` (requires Android Studio/emulator)
- **iOS**: Press `i` (requires Xcode on Mac)
- **Phone**: Scan QR code with Expo Go app
- **Web**: Press `w` (opens in browser)

## 📱 Testing the App

### Login

- Use the credentials you created in Firebase Authentication
- Example: `admin@example.com` / `your-password`

### Add Sample Data

You can add sample data through the app or manually in Firestore:

**Sample Course:**

```json
{
  "name": "Introduction to Computer Science",
  "code": "CS101",
  "instructorName": "Dr. Smith",
  "schedule": "Mon/Wed 10:00-11:30",
  "startTime": "10:00",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Sample Student:**

```json
{
  "name": "John Doe",
  "studentNumber": "2024001",
  "email": "john.doe@student.edu",
  "enrolledCourses": ["COURSE_ID_HERE"],
  "photoUrl": null
}
```

## 🔧 Troubleshooting

### "No Firebase App '[DEFAULT]' has been created"

- Check `config/firebase.js` has correct credentials
- Restart the app: `npm start -- --clear`

### "Network request failed"

- Check internet connection
- Verify Firebase project is active
- Check Firestore rules allow access

### App crashes on start

```bash
# Clear cache and restart
npm start -- --clear

# Or reinstall
rm -rf node_modules
npm install
npm start
```

### Navigation not working

- Make sure all screen files are created
- Check import paths in `navigation/AppNavigator.js`

## 📋 Features Checklist

Once running, test these features:

- [ ] Login with Firebase auth
- [ ] View dashboard statistics
- [ ] Create a new course
- [ ] View students list
- [ ] Record attendance
- [ ] View warnings
- [ ] Check analytics (requires attendance data)
- [ ] View predictions (requires historical data)
- [ ] Generate reports

## 🎯 Next Steps

1. **Customize UI**: Update colors and branding in screen styles
2. **Add More Features**: Implement additional functionality
3. **Deploy**: Build for production with `expo build`
4. **Add Push Notifications**: For warnings and alerts

## 📖 Documentation

- Main README: `README.md`
- Firebase Setup: See Firebase Console
- Expo Docs: https://docs.expo.dev
- React Navigation: https://reactnavigation.org

## ⚡ Quick Commands

```bash
# Start development server
npm start

# Clear cache
npm start -- --clear

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

Enjoy your new Attendance Management Mobile App! 🎉
