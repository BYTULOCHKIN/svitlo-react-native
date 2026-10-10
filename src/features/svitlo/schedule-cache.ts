import { storage } from '@/lib/storage';
import { fetchSchedule } from './poe-api';
import { createScheduleRepository } from './schedule-repository';

export const scheduleRepository = createScheduleRepository(storage, fetchSchedule);
