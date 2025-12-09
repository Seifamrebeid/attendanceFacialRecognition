// Main App Component
// Entry point for the Attendance Management System mobile app

import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./context/AuthContext";
import AppNavigator from "./navigation/AppNavigator";

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
