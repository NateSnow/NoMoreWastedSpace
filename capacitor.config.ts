import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gridfinity.drawerdesigner',
  appName: 'Gridfinity Drawer Designer',
  webDir: 'dist',
  android: {
    // Minimum Android 10 (API level 29) per Requirement 7.2
    minSdkVersion: 29,
    // Allow mixed content for development
    allowMixedContent: true,
  },
  server: {
    // Enable proper touch event handling on Android WebView
    androidScheme: 'https',
  },
  plugins: {
    // Keyboard plugin configuration for mobile input handling
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
