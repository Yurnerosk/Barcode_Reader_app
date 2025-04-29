import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs>
        <Tabs.Screen 
          name="index" 
          options={{
            headerShown: false,
            title: "Scanner",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="scan-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen 
          name="banks" 
          options={{
            title: "Gerenciar Bancos",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen 
          name="results" 
          options={{
            title: "Histórico",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen 
          name="analytics" 
          options={{
            title: "Análises",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen 
          name="about" 
          options={{
            title: "Sobre",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="information-circle-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}