import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getDateKey } from './models';
import { scheduleRepository } from './schedule-cache';
import { currentSchedule } from './schedule-repository';

export function useSchedule() {
  const date = getDateKey();
  const saved = useMemo(() => {
    const snapshot = scheduleRepository.load();
    return snapshot && snapshot.day.date <= date ? snapshot : undefined;
  }, [date]);
  const query = useQuery({ queryKey: ['svitlo-schedule', date], queryFn: ({ signal }) => scheduleRepository.fetch(date, signal), initialData: saved?.day.date === date ? saved : undefined, initialDataUpdatedAt: 0, staleTime: 5 * 60 * 1000, retry: 1 });
  const refresh = () => query.isFetching ? Promise.resolve() : query.refetch({ cancelRefetch: false });
  const snapshot = query.data ?? saved;
  return { ...query, data: snapshot?.day, currentDay: currentSchedule(snapshot, date), snapshot, refresh };
}
