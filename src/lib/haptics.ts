/**
 * Mobile haptic feedback utility
 * Provides vibration patterns for mobile interactions
 */

/**
 * Trigger haptic feedback on supported devices
 * @param pattern - Number (ms) or array of numbers representing vibration pattern
 * @example
 * vibrate(10); // 10ms vibration
 * vibrate([100, 50, 100]); // Pattern: 100ms vibrate, 50ms pause, 100ms vibrate
 */
export const vibrate = (pattern?: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern || 10);
  }
};

/**
 * Light tap feedback - for subtle interactions
 */
export const tapFeedback = () => {
  vibrate(10);
};

/**
 * Medium feedback - for button presses
 */
export const pressFeedback = () => {
  vibrate(20);
};

/**
 * Strong feedback - for important actions
 */
export const strongFeedback = () => {
  vibrate(30);
};

/**
 * Success feedback - for positive confirmations
 */
export const successFeedback = () => {
  vibrate([30, 50, 30]);
};

/**
 * Error feedback - for error states
 */
export const errorFeedback = () => {
  vibrate([50, 100, 50]);
};

/**
 * Selection feedback - for selecting items
 */
export const selectionFeedback = () => {
  vibrate([15, 10, 15]);
};
