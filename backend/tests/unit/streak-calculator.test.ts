import { StreakCalculator } from '../../src/modules/engagement/streak-calculator';
import { prisma } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  prisma: {
    userLoginStreak: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  }
}));

jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('StreakCalculator (Unit Tests)', () => {
  const userId = 'user-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize a new streak when no record exists for the user', async () => {
    (prisma.userLoginStreak.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.userLoginStreak.create as jest.Mock).mockResolvedValue({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      totalActiveDays: 1,
      lastActiveDate: new Date('2026-03-01T00:00:00Z')
    });

    const result = await StreakCalculator.recordUserActivity(userId, new Date('2026-03-01T12:00:00Z'));

    expect(prisma.userLoginStreak.findUnique).toHaveBeenCalledWith({ where: { userId } });
    expect(prisma.userLoginStreak.create).toHaveBeenCalledWith({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        totalActiveDays: 1,
        lastActiveDate: expect.any(Date)
      }
    });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.totalActiveDays).toBe(1);
    expect(result.isNewStreakIncrement).toBe(true);
  });

  it('should NOT increment streak if user logs in multiple times on the same calendar day', async () => {
    const existingDate = new Date('2026-03-01T10:00:00Z');
    (prisma.userLoginStreak.findUnique as jest.Mock).mockResolvedValue({
      userId,
      currentStreak: 5,
      longestStreak: 10,
      totalActiveDays: 20,
      lastActiveDate: existingDate
    });

    const sameDayLater = new Date('2026-03-01T12:00:00Z');
    const result = await StreakCalculator.recordUserActivity(userId, sameDayLater);

    expect(prisma.userLoginStreak.update).not.toHaveBeenCalled();
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(10);
    expect(result.totalActiveDays).toBe(20);
    expect(result.isNewStreakIncrement).toBe(false);
  });

  it('should increment currentStreak and totalActiveDays on consecutive calendar days', async () => {
    const day1 = new Date('2026-03-01T10:00:00Z');
    (prisma.userLoginStreak.findUnique as jest.Mock).mockResolvedValue({
      userId,
      currentStreak: 4,
      longestStreak: 4,
      totalActiveDays: 12,
      lastActiveDate: day1
    });

    const day2 = new Date('2026-03-02T10:00:00Z');
    (prisma.userLoginStreak.update as jest.Mock).mockResolvedValue({
      userId,
      currentStreak: 5,
      longestStreak: 5,
      totalActiveDays: 13,
      lastActiveDate: day2
    });

    const result = await StreakCalculator.recordUserActivity(userId, day2);

    expect(prisma.userLoginStreak.update).toHaveBeenCalledWith({
      where: { userId },
      data: {
        currentStreak: 5,
        longestStreak: 5,
        totalActiveDays: 13,
        lastActiveDate: expect.any(Date)
      }
    });
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
    expect(result.totalActiveDays).toBe(13);
    expect(result.isNewStreakIncrement).toBe(true);
  });

  it('should reset currentStreak to 1 when a day is skipped, while keeping longestStreak intact', async () => {
    const day1 = new Date('2026-03-01T10:00:00Z');
    (prisma.userLoginStreak.findUnique as jest.Mock).mockResolvedValue({
      userId,
      currentStreak: 15,
      longestStreak: 20,
      totalActiveDays: 45,
      lastActiveDate: day1
    });

    // Logging in on March 4 (skipped March 2 and 3 -> diffDays = 3)
    const day4 = new Date('2026-03-04T14:00:00Z');
    (prisma.userLoginStreak.update as jest.Mock).mockResolvedValue({
      userId,
      currentStreak: 1,
      longestStreak: 20,
      totalActiveDays: 46,
      lastActiveDate: day4
    });

    const result = await StreakCalculator.recordUserActivity(userId, day4);

    expect(prisma.userLoginStreak.update).toHaveBeenCalledWith({
      where: { userId },
      data: {
        currentStreak: 1,
        totalActiveDays: 46,
        lastActiveDate: expect.any(Date)
      }
    });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(20);
    expect(result.totalActiveDays).toBe(46);
    expect(result.isNewStreakIncrement).toBe(true);
  });
});
