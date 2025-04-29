import { Tabs } from 'expo-router';
import React from 'react';
import { MainHeader, HistoryHeader } from '@/components/header';
import { useTheme } from 'react-native-paper';
import { Icon } from 'react-native-paper';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.outline,
        },
      }}
      initialRouteName="index">
      <Tabs.Screen
        name="index"
        options={{
          title: 'Input',
          header: () => <MainHeader />,
          tabBarIcon: ({ color, size }) => (
            <Icon
              source="import"
              color={color}
              size={24}
              theme={theme}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Result',
          header: () => <HistoryHeader />,
          tabBarIcon: ({ color, size }) => (
            <Icon
              source="file-document"
              color={color}
              size={24}
              theme={theme}
            />
          ),
        }}
      />
    </Tabs>
  );
}