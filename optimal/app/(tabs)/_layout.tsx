import { Tabs } from 'expo-router';
import React from 'react';
import Header from '@/components/header';
export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => (
          <Header />
        ),
      }}
      initialRouteName='index'>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Input',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Result',
        }}
      />
    </Tabs>
  );
}
