import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { getDateKey } from './models';
import { scheduleRepository } from './schedule-cache';
import { currentSchedule } from './schedule-repository';

export function useSchedule(now: Date) {
  const date = getDateKey(now);
  const client = useQueryClient();
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active')
        return;
      const key = ['svitlo-schedule', getDateKey()];
      const cached = client.getQueryState(key);
      if (cached && Date.now() - cached.dataUpdatedAt >= 5 * 60 * 1000)
        void client.invalidateQueries({ queryKey: key, exact: true }, { cancelRefetch: false });
    });
    return () => subscription.remove();
  }, [client]);
  const saved = useMemo(() => {
    const snapshot = scheduleRepository.load();
    return snapshot && snapshot.day.date <= date ? snapshot : undefined;
  }, [date]);
  const query = useQuery({ queryKey: ['svitlo-schedule', date], queryFn: ({ signal }) => scheduleRepository.fetch(date, signal), initialData: saved?.day.date === date ? saved : undefined, initialDataUpdatedAt: 0, staleTime: 5 * 60 * 1000, retry: 1 });
  const refresh = () => query.isFetching ? Promise.resolve() : query.refetch({ cancelRefetch: false });
  const snapshot = query.data ?? saved;
  return { ...query, data: snapshot?.day, currentDay: currentSchedule(snapshot, date), snapshot, refresh };
}
