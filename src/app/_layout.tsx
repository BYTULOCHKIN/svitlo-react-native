import type { ViewProps } from 'react-native';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Uniwind } from 'uniwind';

import { getAppTheme } from '@/components/ui/use-theme-config';
import { metrics, palette } from '@/design-system/tokens';
import { APIProvider } from '@/lib/api';
// Import  global CSS file
import '../global.css';

export { ErrorBoundary } from 'expo-router';

// eslint-disable-next-line react-refresh/only-export-components
export const unstable_settings = {
  initialRouteName: '(app)',
};

Uniwind.setTheme('dark');
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: metrics.splashFadeDuration,
  fade: true,
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const hasHiddenSplash = React.useRef(false);

  const onLayoutRootView = React.useCallback(() => {
    if (hasHiddenSplash.current) {
      return;
    }

    hasHiddenSplash.current = true;
    SplashScreen.hide();
  }, []);

  if (fontError)
    throw fontError;
  if (!fontsLoaded)
    return null;

  return (
    <Providers onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </Providers>
  );
}

function Providers({
  children,
  onLayout,
}: {
  children: React.ReactNode;
  onLayout: ViewProps['onLayout'];
}) {
  const theme = getAppTheme();
  return (
    <GestureHandlerRootView
      onLayout={onLayout}
      style={styles.container}
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes
      className={theme.dark ? `dark` : undefined}
    >
      <KeyboardProvider>
        <ThemeProvider value={theme}>
          <APIProvider>
            <BottomSheetModalProvider>
              {children}
              <FlashMessage position="top" />
            </BottomSheetModalProvider>
          </APIProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
});
