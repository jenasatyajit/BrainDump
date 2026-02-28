import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';

function CustomDrawerContent(props: DrawerContentComponentProps) {
  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: '#111118' }}>
      <View className="px-6 pb-4 pt-2">
        <Text className="text-2xl font-extrabold text-text">
          DU<Text className="text-accent">MP</Text>
        </Text>
        <Text className="mt-1 text-xs text-muted">Semantic Inbox</Text>
      </View>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#111118',
          width: 280,
        },
        drawerActiveTintColor: '#7fff9e',
        drawerInactiveTintColor: '#5a5a70',
        drawerLabelStyle: {
          fontSize: 14,
        },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: 'Inbox',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          headerShown: true,
          headerTitle: 'Settings',
          headerStyle: { backgroundColor: '#111118' },
          headerTintColor: '#e8e8f0',
          drawerLabel: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="archive"
        options={{
          headerShown: true,
          headerTitle: 'Archive',
          headerStyle: { backgroundColor: '#111118' },
          headerTintColor: '#e8e8f0',
          drawerLabel: 'Archive',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="archive-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}
