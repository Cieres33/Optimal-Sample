import { Tabs } from 'expo-router';
import React from 'react';
import {MainHeader, HistoryHeader} from '@/components/header';
export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
      }}
      initialRouteName='index'>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Input',
          header: () => <MainHeader />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Result',
          header: () => <HistoryHeader />,
        }}
      />
    </Tabs>
  );
}
