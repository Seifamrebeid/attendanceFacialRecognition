// Navigation Configuration
// Sets up the navigation structure for the app

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useAuth } from "../context/AuthContext";

// Import screens
import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import CoursesScreen from "../screens/CoursesScreen";
import StudentsScreen from "../screens/StudentsScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import WarningsScreen from "../screens/WarningsScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import PredictionsScreen from "../screens/PredictionsScreen";
import ReportsScreen from "../screens/ReportsScreen";

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer Navigator for authenticated users
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerStyle: {
          backgroundColor: "#2563eb",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        drawerActiveTintColor: "#2563eb",
        drawerInactiveTintColor: "#666",
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Admin Dashboard" }}
      />
      <Drawer.Screen
        name="Courses"
        component={CoursesScreen}
        options={{ title: "Courses" }}
      />
      <Drawer.Screen
        name="Students"
        component={StudentsScreen}
        options={{ title: "Students" }}
      />
      <Drawer.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ title: "Attendance" }}
      />
      <Drawer.Screen
        name="Warnings"
        component={WarningsScreen}
        options={{ title: "Warnings" }}
      />
      <Drawer.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: "Late Analytics" }}
      />
      <Drawer.Screen
        name="Predictions"
        component={PredictionsScreen}
        options={{ title: "Absence Predictions" }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: "Reports" }}
      />
    </Drawer.Navigator>
  );
}

// Main Navigation
export default function AppNavigator() {
  const { currentUser } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser ? (
          <Stack.Screen name="Main" component={DrawerNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
