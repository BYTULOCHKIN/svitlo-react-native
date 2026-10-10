import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Local rendering clock only. Network fetching belongs to useSchedule.
export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    function updateActivity(active: boolean) {
      clearInterval(timer);
      timer = undefined;
      if (active) {
        setNow(new Date());
        timer = setInterval(() => setNow(new Date()), 1000);
      }
    }
    if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive')
      timer = setInterval(() => setNow(new Date()), 1000);
    const subscription = AppState.addEventListener('change', state => updateActivity(state === 'active'));
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  return now;
}
