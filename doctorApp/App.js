import { Text, View, Button } from "react-native";
import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <View style={{ 
      flex: 1, 
      alignItems: "center", 
      justifyContent: "center", 
      backgroundColor: "#f0f0f0", 
      padding: 20 
    }}>
      <Text style={{ fontSize: 24, marginBottom: 10 }}>Hello Seif 👋</Text>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>You clickred: {count} times</Text>
      <Button title="Click me" onPress={() => setCount(count + 1)} />
    </View>
  );
}
