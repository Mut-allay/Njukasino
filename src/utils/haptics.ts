export const hapticFeedback = (intensity: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    const duration = intensity === 'light' ? 10 : intensity === 'medium' ? 30 : 50;
    window.navigator.vibrate(duration);
  }
};
