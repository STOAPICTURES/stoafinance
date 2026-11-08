/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Platform abstraction layer for Web, PWA, and future Capacitor (Android & iOS) builds.
 */

export interface PlatformInfo {
  isCapacitor: boolean;
  isPWA: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  platform: 'ios' | 'android' | 'web';
}

export function getPlatformInfo(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      isCapacitor: false,
      isPWA: false,
      isIOS: false,
      isAndroid: false,
      isMobile: false,
      platform: 'web',
    };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isCapacitor = !!(window as any).Capacitor;
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /mobile/.test(userAgent);
  const isPWA = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  let platform: 'ios' | 'android' | 'web' = 'web';
  if (isCapacitor && (window as any).Capacitor?.getPlatform) {
    platform = (window as any).Capacitor.getPlatform();
  } else if (isIOS) {
    platform = 'ios';
  } else if (isAndroid) {
    platform = 'android';
  }

  return {
    isCapacitor,
    isPWA,
    isIOS,
    isAndroid,
    isMobile,
    platform,
  };
}

/**
 * Trigger subtle haptic feedback across web browsers and mobile shells
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window === 'undefined') return;

  try {
    // If future Capacitor Haptics plugin is registered
    if ((window as any).Capacitor?.Plugins?.Haptics) {
      (window as any).Capacitor.Plugins.Haptics.impact({ style: type.toUpperCase() });
      return;
    }

    // Web Vibration API fallback
    if ('vibrate' in navigator) {
      if (type === 'light') navigator.vibrate(10);
      else if (type === 'medium') navigator.vibrate(25);
      else if (type === 'heavy') navigator.vibrate(45);
    }
  } catch {
    // Graceful silent fallback
  }
}

/**
 * Native share abstraction
 */
export async function shareContent(data: { title: string; text?: string; url?: string }): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
