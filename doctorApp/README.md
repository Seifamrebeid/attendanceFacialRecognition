# Admin App - Attendance Management System

This is the mobile admin application for the Attendance Facial Recognition system, built with [Expo](https://expo.dev) and React Native.

## Overview

This mobile app provides full administrative capabilities for managing courses, students, attendance records, and warnings. It's a complete migration of the web-based admin panel to a native mobile experience.

## Features

- 🔐 **Secure Authentication** - Firebase-based login system
- 📊 **Dashboard** - Overview of courses, students, and attendance statistics
- 📚 **Course Management** - Full CRUD operations for courses
- 👥 **Student Management** - View and manage student records
- ✅ **Attendance Tracking** - Monitor attendance in real-time
- 📈 **Reports & Analytics** - Generate and view attendance reports
- ⚠️ **Warning System** - Track and manage student warnings

## Getting Started

### Prerequisites

- Node.js 16+ installed
- iOS Simulator (for iOS development) or Android Studio (for Android)
- Expo Go app on your physical device (optional)

### Installation

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the development server

   ```bash
   npx expo start
   ```

3. Run on your preferred platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app

## Project Structure

```
doctorApp/
├── app/                    # File-based routing
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Dashboard
│   │   ├── courses.tsx    # Courses management
│   │   ├── explore.tsx    # Students list
│   │   ├── attendance.tsx # Attendance tracking
│   │   └── reports.tsx    # Reports
│   ├── login.tsx          # Login screen
│   └── _layout.tsx        # Root layout
├── screens/               # Screen components
├── services/              # API services
│   └── admin/            # Admin-specific services
├── context/              # React context providers
├── components/           # Reusable components
└── config/               # Configuration files
```

## Authentication

Default admin credentials should be configured in your Firebase console. Users need to log in before accessing any admin features.

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint

## Firebase Configuration

The app connects to Firebase for:
- Authentication
- Firestore database
- Cloud functions

Configuration is in `config/firebase.ts`. Make sure Firebase is properly set up for your project.

## Migration from Web Admin

This app is a complete migration of the web-based admin panel. See [MIGRATION.md](./MIGRATION.md) for detailed information about:
- What was migrated
- Key differences from the web version
- Features not yet implemented
- Future enhancement opportunities

## Technology Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and tools
- **TypeScript** - Type-safe JavaScript
- **Firebase** - Backend services
- **Expo Router** - File-based navigation

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly on both iOS and Android
4. Submit a pull request

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)

## Support

For issues or questions, please create an issue in the repository.

