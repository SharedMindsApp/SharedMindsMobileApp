/**
 * Screen Time Native Bridge
 * 
 * Interface for communicating with native mobile app to:
 * - Get installed apps
 * - Request permissions
 * - Monitor app usage in real-time
 * 
 * This will be implemented via Capacitor plugin in the native app.
 */

import type { InstalledApp } from '../../components/tracker-studio/ScreenTimeAppView';

/**
 * Check if native bridge is available
 */
export async function checkNativeBridgeAvailable(): Promise<boolean> {
  // Check if running in native app (Capacitor)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return true;
  }
  
  // Check if running in React Native
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    return true;
  }
  
  return false;
}

/**
 * Request app usage permission from the device
 */
export async function requestAppUsagePermission(): Promise<boolean> {
  try {
    // TODO: Implement via Capacitor plugin
    // const { ScreenTime } = await import('@capacitor/screen-time');
    // const result = await ScreenTime.requestPermission();
    // return result.granted;
    
    // For web, return false (permission not available)
    if (!(await checkNativeBridgeAvailable())) {
      return false;
    }
    
    // Mock for now - will be replaced with actual native call
    return true;
  } catch (err) {
    console.error('Failed to request permission:', err);
    return false;
  }
}

/**
 * Get list of installed apps from the device
 */
export async function getInstalledApps(): Promise<InstalledApp[]> {
  try {
    if (!(await checkNativeBridgeAvailable())) {
      throw new Error('Native bridge not available. Please use the Shared Minds mobile app.');
    }

    // TODO: Implement via Capacitor plugin
    // const { ScreenTime } = await import('@capacitor/screen-time');
    // const result = await ScreenTime.getInstalledApps();
    // return result.apps.map(app => ({
    //   id: app.packageName || app.bundleId,
    //   name: app.name,
    //   packageName: app.packageName,
    //   category: app.category || 'other',
    //   icon: app.icon, // Base64 encoded icon
    // }));

    // Mock data for development
    return [
      { id: '1', name: 'Instagram', packageName: 'com.instagram.android', category: 'social' },
      { id: '2', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', category: 'entertainment' },
      { id: '3', name: 'Facebook', packageName: 'com.facebook.katana', category: 'social' },
      { id: '4', name: 'Twitter', packageName: 'com.twitter.android', category: 'social' },
      { id: '5', name: 'YouTube', packageName: 'com.google.android.youtube', category: 'entertainment' },
      { id: '6', name: 'Netflix', packageName: 'com.netflix.mediaclient', category: 'entertainment' },
      { id: '7', name: 'WhatsApp', packageName: 'com.whatsapp', category: 'social' },
      { id: '8', name: 'Gmail', packageName: 'com.google.android.gm', category: 'productivity' },
      { id: '9', name: 'Chrome', packageName: 'com.android.chrome', category: 'productivity' },
      { id: '10', name: 'Spotify', packageName: 'com.spotify.music', category: 'entertainment' },
      { id: '11', name: 'Candy Crush', packageName: 'com.king.candycrushsaga', category: 'games' },
      { id: '12', name: 'Amazon Shopping', packageName: 'com.amazon.mShop.android.shopping', category: 'shopping' },
    ];
  } catch (err) {
    console.error('Failed to get installed apps:', err);
    throw new Error('Failed to load installed apps. Make sure you\'re using the native Shared Minds app.');
  }
}

/**
 * Start monitoring app usage for a specific app
 * This sets up real-time tracking that calls recordAppUsageEvent automatically
 */
export async function startMonitoringApp(
  packageName: string,
  callbacks: {
    onAppOpened?: (event: { appName: string; timestamp: string }) => void;
    onAppClosed?: (event: { appName: string; timestamp: string; sessionDuration: number }) => void;
    onForeground?: (event: { appName: string; timestamp: string }) => void;
    onBackground?: (event: { appName: string; timestamp: string }) => void;
  }
): Promise<void> {
  try {
    if (!(await checkNativeBridgeAvailable())) {
      throw new Error('Native bridge not available');
    }

    // TODO: Implement via Capacitor plugin
    // const { ScreenTime } = await import('@capacitor/screen-time');
    // await ScreenTime.startMonitoring({
    //   packageName,
    //   onAppOpened: callbacks.onAppOpened,
    //   onAppClosed: callbacks.onAppClosed,
    //   onForeground: callbacks.onForeground,
    //   onBackground: callbacks.onBackground,
    // });
    
    console.log('Monitoring started for:', packageName);
  } catch (err) {
    console.error('Failed to start monitoring:', err);
    throw err;
  }
}

/**
 * Stop monitoring app usage for a specific app
 */
export async function stopMonitoringApp(packageName: string): Promise<void> {
  try {
    if (!(await checkNativeBridgeAvailable())) {
      return;
    }

    // TODO: Implement via Capacitor plugin
    // const { ScreenTime } = await import('@capacitor/screen-time');
    // await ScreenTime.stopMonitoring({ packageName });
    
    console.log('Monitoring stopped for:', packageName);
  } catch (err) {
    console.error('Failed to stop monitoring:', err);
  }
}
