import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

export interface StreakUpdateResult {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  lastActiveDate: Date;
  isNewStreakIncrement: boolean;
}

export class StreakCalculator {
  /**
   * Processes activity date and updates user streak record in database
   */
  public static async recordUserActivity(
    userId: string,
    activityDate: Date = new Date()
  ): Promise<StreakUpdateResult> {
    const today = startOfDay(activityDate);

    const existing = await prisma.userLoginStreak.findUnique({
      where: { userId }
    });

    if (!existing) {
      const created = await prisma.userLoginStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          totalActiveDays: 1,
          lastActiveDate: today
        }
      });

      return {
        currentStreak: created.currentStreak,
        longestStreak: created.longestStreak,
        totalActiveDays: created.totalActiveDays,
        lastActiveDate: created.lastActiveDate,
        isNewStreakIncrement: true
      };
    }

    const lastActive = startOfDay(existing.lastActiveDate);
    const diffDays = differenceInCalendarDays(today, lastActive);

    // Case 1: Same calendar day -> no streak change
    if (diffDays === 0) {
      return {
        currentStreak: existing.currentStreak,
        longestStreak: existing.longestStreak,
        totalActiveDays: existing.totalActiveDays,
        lastActiveDate: existing.lastActiveDate,
        isNewStreakIncrement: false
      };
    }

    // Case 2: Consecutive calendar day -> increment streak
    if (diffDays === 1) {
      const newCurrent = existing.currentStreak + 1;
      const newLongest = Math.max(existing.longestStreak, newCurrent);
      const newTotal = existing.totalActiveDays + 1;

      const updated = await prisma.userLoginStreak.update({
        where: { userId },
        data: {
          currentStreak: newCurrent,
          longestStreak: newLongest,
          totalActiveDays: newTotal,
          lastActiveDate: today
        }
      });

      logger.info(`[StreakCalculator] Incremented streak for user ${userId} to ${newCurrent} days`);

      return {
        currentStreak: updated.currentStreak,
        longestStreak: updated.longestStreak,
        totalActiveDays: updated.totalActiveDays,
        lastActiveDate: updated.lastActiveDate,
        isNewStreakIncrement: true
      };
    }

    // Case 3: Missed one or more days -> reset current streak to 1
    const resetStreak = 1;
    const newTotal = existing.totalActiveDays + 1;

    const updated = await prisma.userLoginStreak.update({
      where: { userId },
      data: {
        currentStreak: resetStreak,
        totalActiveDays: newTotal,
        lastActiveDate: today
      }
    });

    logger.info(`[StreakCalculator] Reset streak for user ${userId} after ${diffDays} inactive days`);

    return {
      currentStreak: updated.currentStreak,
      longestStreak: updated.longestStreak,
      totalActiveDays: updated.totalActiveDays,
      lastActiveDate: updated.lastActiveDate,
      isNewStreakIncrement: true
    };
  }
}
