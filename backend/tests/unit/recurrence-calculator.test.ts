import { RecurrenceFrequency, DayOfWeek } from '@prisma/client';
import { RecurrenceCalculator, RecurrenceConfig } from '../../src/modules/recurring/recurrence-calculator';
import { format } from 'date-fns';

describe('RecurrenceCalculator (Unit Tests)', () => {
  describe('DAILY Frequency', () => {
    it('should calculate next day for daily interval 1', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.DAILY,
        interval: 1,
        startDate: new Date('2026-01-01T00:00:00Z'),
        occurrencesCreated: 0
      };

      const next = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-01T00:00:00Z'));
      expect(next).not.toBeNull();
      expect(format(next!, 'yyyy-MM-dd')).toBe('2026-01-02');
    });

    it('should calculate next occurrence with interval 3 days', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.DAILY,
        interval: 3,
        startDate: new Date('2026-01-01T00:00:00Z'),
        occurrencesCreated: 1
      };

      const next = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-01T00:00:00Z'));
      expect(next).not.toBeNull();
      expect(format(next!, 'yyyy-MM-dd')).toBe('2026-01-04');
    });

    it('should return startDate if afterDate is before startDate', () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.DAILY,
        interval: 1,
        startDate,
        occurrencesCreated: 0
      };

      const next = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-01T00:00:00Z'));
      expect(next).not.toBeNull();
      expect(format(next!, 'yyyy-MM-dd')).toBe('2026-06-01');
    });
  });

  describe('WEEKLY Frequency', () => {
    it('should calculate next occurrence for selected weekdays (Monday, Wednesday, Friday)', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.WEEKLY,
        interval: 1,
        startDate: new Date('2026-01-05T00:00:00Z'), // Monday
        weeklyDays: [DayOfWeek.MON, DayOfWeek.WED, DayOfWeek.FRI],
        occurrencesCreated: 0
      };

      // After Monday Jan 5 -> should be Wednesday Jan 7
      const next1 = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-05T00:00:00Z'));
      expect(next1).not.toBeNull();
      expect(format(next1!, 'yyyy-MM-dd')).toBe('2026-01-07');

      // After Wednesday Jan 7 -> should be Friday Jan 9
      const next2 = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-07T00:00:00Z'));
      expect(next2).not.toBeNull();
      expect(format(next2!, 'yyyy-MM-dd')).toBe('2026-01-09');

      // After Friday Jan 9 -> should be next Monday Jan 12
      const next3 = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-09T00:00:00Z'));
      expect(next3).not.toBeNull();
      expect(format(next3!, 'yyyy-MM-dd')).toBe('2026-01-12');
    });

    it('should return null if no weekly days are provided', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.WEEKLY,
        interval: 1,
        startDate: new Date('2026-01-01T00:00:00Z'),
        weeklyDays: [],
        occurrencesCreated: 0
      };

      const next = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-01T00:00:00Z'));
      expect(next).toBeNull();
    });
  });

  describe('MONTHLY Frequency & Boundary Edge Cases', () => {
    it('should calculate next month on same day of month', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2026-01-15T00:00:00Z'),
        monthlyConfig: { dayOfMonth: 15 },
        occurrencesCreated: 0
      };

      const next = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-15T00:00:00Z'));
      expect(next).not.toBeNull();
      expect(format(next!, 'yyyy-MM-dd')).toBe('2026-02-15');
    });

    it('should clamp day of month on shorter months (Jan 31 -> Feb 28 in non-leap year 2026)', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2026-01-31T00:00:00Z'),
        monthlyConfig: { dayOfMonth: 31 },
        occurrencesCreated: 0
      };

      const nextFeb = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-31T00:00:00Z'));
      expect(nextFeb).not.toBeNull();
      // 2026 is not a leap year, so Feb has 28 days
      expect(format(nextFeb!, 'yyyy-MM-dd')).toBe('2026-02-28');
    });

    it('should clamp day of month to Feb 29 in leap year (2028)', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.MONTHLY,
        interval: 1,
        startDate: new Date('2028-01-31T00:00:00Z'),
        monthlyConfig: { dayOfMonth: 31 },
        occurrencesCreated: 0
      };

      const nextFebLeap = RecurrenceCalculator.getNextOccurrence(config, new Date('2028-01-31T00:00:00Z'));
      expect(nextFebLeap).not.toBeNull();
      // 2028 is a leap year -> Feb 29
      expect(format(nextFebLeap!, 'yyyy-MM-dd')).toBe('2028-02-29');
    });

    it('should correctly compute Nth weekday of month (e.g., 2nd Tuesday of March 2026)', () => {
      // March 2026: March 1 is Sunday. Tuesdays are: March 3 (1st), March 10 (2nd), March 17 (3rd), March 24 (4th), March 31 (5th)
      const secondTuesday = RecurrenceCalculator.getNthWeekdayOfMonth(2026, 2, 2, 2);
      expect(format(secondTuesday, 'yyyy-MM-dd')).toBe('2026-03-10');
    });

    it('should correctly compute last (5th/last) Friday of February 2026', () => {
      // Feb 2026: Feb 28 is Saturday, Feb 27 is Friday (the last Friday)
      const lastFriday = RecurrenceCalculator.getNthWeekdayOfMonth(2026, 1, 5, 5);
      expect(format(lastFriday, 'yyyy-MM-dd')).toBe('2026-02-27');
    });
  });

  describe('CUSTOM_CRON Frequency', () => {
    it('should evaluate cron expression (0 9 * * 1-5 = 9 AM on weekdays)', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.CUSTOM_CRON,
        interval: 1,
        cronExpression: '0 9 * * 1-5',
        timezone: 'UTC',
        startDate: new Date('2026-05-01T08:00:00Z'), // Friday
        occurrencesCreated: 0
      };

      const next = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-05-01T08:00:00Z'));
      expect(next).not.toBeNull();
      expect(next?.toISOString()).toBe('2026-05-01T09:00:00.000Z');
    });
  });

  describe('Exception Dates & Termination Bounds', () => {
    it('should skip exception dates and advance to the next valid date', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.DAILY,
        interval: 1,
        startDate: new Date('2026-01-01T00:00:00Z'),
        exceptionDates: ['2026-01-02', '2026-01-03'],
        occurrencesCreated: 0
      };

      // Jan 2 and Jan 3 are blacklisted exceptions; next should be Jan 4
      const next = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-01T00:00:00Z'));
      expect(next).not.toBeNull();
      expect(format(next!, 'yyyy-MM-dd')).toBe('2026-01-04');
    });

    it('should return null when occurrencesCreated reaches maxOccurrences', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.DAILY,
        interval: 1,
        startDate: new Date('2026-01-01T00:00:00Z'),
        maxOccurrences: 5,
        occurrencesCreated: 5
      };

      const next = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-01T00:00:00Z'));
      expect(next).toBeNull();
    });

    it('should return null when calculated candidate exceeds endDate', () => {
      const config: RecurrenceConfig = {
        frequency: RecurrenceFrequency.DAILY,
        interval: 1,
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-01-05T00:00:00Z'),
        occurrencesCreated: 0
      };

      // Searching after Jan 5 must exceed endDate and return null
      const next = RecurrenceCalculator.getNextOccurrence(config, new Date('2026-01-05T00:00:00Z'));
      expect(next).toBeNull();
    });
  });
});
