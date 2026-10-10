import { useE2EFixtures } from '@/lib/e2e';
import { storage } from '@/lib/storage';
import { fetchE2ESchedule } from './e2e-schedule';
import { fetchSchedule } from './poe-api';
import { createScheduleRepository } from './schedule-repository';

export const scheduleRepository = createScheduleRepository(storage, useE2EFixtures ? fetchE2ESchedule : fetchSchedule);
