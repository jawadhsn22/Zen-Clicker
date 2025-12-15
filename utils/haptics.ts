
/**
 * Triggers haptic feedback with cross-platform support.
 * 
 * Android/Chrome: Uses navigator.vibrate()
 * iOS Safari: Uses a checkbox toggle hack to trigger system UI selection haptics
 */
export const triggerHaptic = (enabled: boolean) => {
  if (!enabled || typeof window === 'undefined') return;

  // Check for standard Vibration API support
  // Note: iOS Safari does not support navigator.vibrate
  const hasVibrate = 'vibrate' in navigator;

  if (hasVibrate) {
    // Android/Desktop
    // Bumped to 20ms because 10ms is often ignored by Android drivers or too subtle
    try {
        navigator.vibrate(20);
    } catch (e) {
        // Ignore permission errors
    }
  } else {
    // iOS Fallback Strategy
    // We toggle a hidden checkbox via its label. iOS often triggers a 
    // "Selection" haptic feedback when a standard UI control changes state.
    const input = document.getElementById('haptic-ios-hack') as HTMLInputElement;
    if (input && input.labels && input.labels.length > 0) {
        const label = input.labels[0];
        // Programmatically clicking the label triggers the input change 
        // and simulates user interaction for the OS
        label.click();
    }
  }
};
