import { useQuery } from '@tanstack/react-query';
import { getDateKey } from './models';
import { fetchSchedule } from './poe-api';

export function useSchedule() {
  const date = getDateKey();
  const query = useQuery({ queryKey: ['svitlo-schedule', date], queryFn: ({ signal }) => fetchSchedule(date, signal), staleTime: 5 * 60 * 1000, retry: 1 });
  const refresh = () => query.isFetching ? Promise.resolve() : query.refetch({ cancelRefetch: false });
  return { ...query, refresh };
}
