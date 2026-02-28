import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text } from 'react-native';

export default function Modal() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-lg text-text">Modal</Text>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}
