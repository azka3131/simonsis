import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Halaman Login */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        {/* Tab Bawaan (bisa dihapus kalau tidak dipakai) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* --- TAMBAHKAN BAGIAN INI --- */}
        {/* Sembunyikan header bawaan agar tulisan 'admin/index' hilang */}
        <Stack.Screen name="admin/index" options={{ headerShown: false }} />
        <Stack.Screen name="guru/index" options={{ headerShown: false }} />
        <Stack.Screen name="kepsek/index" options={{ headerShown: false }} />
        {/* --------------------------- */}

        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}