import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#0b0b0b',
          borderTopColor: '#232323',
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-variant" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planes"
        options={{
          title: 'Rutinas',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-text-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ejercicios"
        options={{
          title: 'Ejercicios',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="dumbbell" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="eventos"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-star" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="horarios"
        options={{
          title: 'Horario',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clock-time-five-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
