import { Tabs } from 'expo-router';
import React from 'react';
import {MainHeader, HistoryHeader} from '@/components/header';
import { Icon, MD3Colors } from 'react-native-paper';
export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: 'blue',
        tabBarInactiveTintColor: 'gray'
      }}
      initialRouteName='index'>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Input',
          tabBarIcon: ({ color, size }) => (
            <Icon
            source="import"
            color={MD3Colors.error50}
            size={20}
          />
          ),
        }}
        
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Result',
          tabBarIcon: ({ color, size }) => (
            <Icon
            source="file-document"
            color={MD3Colors.error50}
            size={20}
          />
          ),
        }}
      />
    </Tabs>
  );
}
