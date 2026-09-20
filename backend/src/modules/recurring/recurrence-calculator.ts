import { RecurrenceFrequency, DayOfWeek } from '@prisma/client';
import cronParser from 'cron-parser';
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  setDay,
  setDate,
  lastDayOfMonth,
  startOfDay,
  isBefore,
  isAfter,
  isSameDay,
  format
} from 'date-fns';

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  interval: number;
  cronExpression?: string | null;
  timezone?: string;
  startDate: Date;
  endDate?: Date | null;
  maxOccurrences?: number | null;
  occurrencesCreated: number;
  weeklyDays?: DayOfWeek[];
  monthlyConfig?: {
    dayOfMonth?: number | null;
    weekOrdinal?: number | null;
    dayOfWeek?: DayOfWeek | null;
  } | null;
  exceptionDates?: (Date | string)[];
}

const DAY_OF_WEEK_MAP: Record<DayOfWeek, number> = {
  [DayOfWeek.SUN]: 0,
  [DayOfWeek.MON]: 1,
  [DayOfWeek.TUE]: 2,
  [DayOfWeek.WED]: 3,
  [DayOfWeek.THU]: 4,
  [DayOfWeek.FRI]: 5,
  [DayOfWeek.SAT]: 6
};

export class RecurrenceCalculator {
  /**
   * Calculates the next valid occurrence date after `afterDate` (or after startDate if not specified)
   */
  public static getNextOccurrence(
    config: RecurrenceConfig,
    afterDate: Date = new Date()
  ): Date | null {
    // 1. Check if max occurrences reached
    if (config.maxOccurrences && config.occurrencesCreated >= config.maxOccurrences) {
      return null;
    }

    const interval = Math.max(1, config.interval || 1);
    const startDate = new Date(config.startDate);
    const endDate = config.endDate ? new Date(config.endDate) : null;
    const exceptionSet = new Set(
      (config.exceptionDates || []).map((d) =>
        typeof d === 'string' ? d.substring(0, 10) : format(d, 'yyyy-MM-dd')
      )
    );

    let candidate: Date | null = null;

    switch (config.frequency) {
      case RecurrenceFrequency.DAILY: {
        candidate = this.calculateNextDaily(startDate, afterDate, interval);
        break;
      }

      case RecurrenceFrequency.WEEKLY: {
        candidate = this.calculateNextWeekly(
          startDate,
          afterDate,
          interval,
          config.weeklyDays || [DayOfWeek.MON]
        );
        break;
      }

      case RecurrenceFrequency.MONTHLY: {
        candidate = this.calculateNextMonthly(
          startDate,
          afterDate,
          interval,
          config.monthlyConfig
        );
        break;
      }

      case RecurrenceFrequency.YEARLY: {
        candidate = this.calculateNextYearly(startDate, afterDate, interval);
        break;
      }

      case RecurrenceFrequency.CUSTOM_CRON: {
        candidate = this.calculateNextCron(
          config.cronExpression || '0 0 * * *',
          afterDate,
          config.timezone || 'UTC'
        );
        break;
      }

      default:
        candidate = null;
    }

    // Iterate through candidates until one is found that is NOT in exceptions
    while (candidate) {
      // Check end date bound
      if (endDate && isAfter(candidate, endDate)) {
        return null;
      }

      const formatted = format(candidate, 'yyyy-MM-dd');
      if (!exceptionSet.has(formatted)) {
        return candidate;
      }

      // If this candidate was an exception date, compute the subsequent occurrence
      candidate = this.getNextOccurrence(
        { ...config, occurrencesCreated: config.occurrencesCreated },
        candidate
      );
    }

    return null;
  }

  private static calculateNextDaily(startDate: Date, afterDate: Date, interval: number): Date {
    if (isBefore(afterDate, startDate)) {
      return startDate;
    }

    const diffDays = Math.floor(
      (afterDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const steps = Math.floor(diffDays / interval) + 1;
    return addDays(startDate, steps * interval);
  }

  private static calculateNextWeekly(
    startDate: Date,
    afterDate: Date,
    interval: number,
    weeklyDays: DayOfWeek[]
  ): Date | null {
    if (weeklyDays.length === 0) return null;

    const targetDayNumbers = weeklyDays
      .map((d) => DAY_OF_WEEK_MAP[d])
      .sort((a, b) => a - b);

    let current = isBefore(afterDate, startDate) ? new Date(startDate) : new Date(afterDate);

    // Search up to 104 weeks ahead for the next valid weekday
    for (let w = 0; w < 104; w++) {
      for (const dayNum of targetDayNumbers) {
        const candidate = setDay(current, dayNum, { weekStartsOn: 0 });
        if (isAfter(candidate, afterDate) && !isBefore(candidate, startDate)) {
          return candidate;
        }
      }
      current = addWeeks(current, interval);
    }

    return null;
  }

  private static calculateNextMonthly(
    startDate: Date,
    afterDate: Date,
    interval: number,
    monthlyConfig?: {
      dayOfMonth?: number | null;
      weekOrdinal?: number | null;
      dayOfWeek?: DayOfWeek | null;
    } | null
  ): Date | null {
    let currentMonth = isBefore(afterDate, startDate) ? new Date(startDate) : new Date(afterDate);

    for (let m = 0; m < 120; m++) {
      let candidate: Date | null = null;

      if (monthlyConfig?.dayOfMonth) {
        const targetDay = monthlyConfig.dayOfMonth;
        const maxDayInMonth = lastDayOfMonth(currentMonth).getDate();
        const clampedDay = Math.min(targetDay, maxDayInMonth);
        candidate = setDate(currentMonth, clampedDay);
      } else if (monthlyConfig?.weekOrdinal && monthlyConfig.dayOfWeek) {
        const targetDayNum = DAY_OF_WEEK_MAP[monthlyConfig.dayOfWeek];
        const ordinal = monthlyConfig.weekOrdinal; // 1..5

        candidate = this.getNthWeekdayOfMonth(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          targetDayNum,
          ordinal
        );
      } else {
        // Default to start date's day of month
        const targetDay = startDate.getDate();
        const maxDayInMonth = lastDayOfMonth(currentMonth).getDate();
        const clampedDay = Math.min(targetDay, maxDayInMonth);
        candidate = setDate(currentMonth, clampedDay);
      }

      if (candidate && isAfter(candidate, afterDate) && !isBefore(candidate, startDate)) {
        return candidate;
      }

      currentMonth = addMonths(currentMonth, interval);
    }

    return null;
  }

  private static calculateNextYearly(startDate: Date, afterDate: Date, interval: number): Date {
    if (isBefore(afterDate, startDate)) {
      return startDate;
    }

    const diffYears = afterDate.getFullYear() - startDate.getFullYear();
    const steps = Math.floor(diffYears / interval) + 1;
    return addYears(startDate, steps * interval);
  }

  private static calculateNextCron(
    cronExpression: string,
    afterDate: Date,
    timezone: string
  ): Date | null {
    try {
      const interval = cronParser.parseExpression(cronExpression, {
        currentDate: afterDate,
        tz: timezone
      });
      return interval.next().toDate();
    } catch (err) {
      return null;
    }
  }

  /**
   * Computes the Nth weekday of a given month (e.g. 2nd Tuesday or last Friday)
   */
  public static getNthWeekdayOfMonth(
    year: number,
    month: number, // 0-indexed (0 = Jan)
    dayOfWeek: number, // 0 = Sun, 1 = Mon...
    ordinal: number // 1..5 (5 = last)
  ): Date {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDay = lastDayOfMonth(firstDayOfMonth).getDate();

    if (ordinal === 5) {
      // Find the last occurrence of dayOfWeek in month
      for (let d = lastDay; d >= 1; d--) {
        const testDate = new Date(year, month, d);
        if (testDate.getDay() === dayOfWeek) {
          return testDate;
        }
      }
    }

    // Find the 1st occurrence of dayOfWeek
    let count = 0;
    for (let d = 1; d <= lastDay; d++) {
      const testDate = new Date(year, month, d);
      if (testDate.getDay() === dayOfWeek) {
        count++;
        if (count === ordinal) {
          return testDate;
        }
      }
    }

    // Fallback if 5th does not exist: return the 4th occurrence
    return new Date(year, month, lastDay);
  }
}
