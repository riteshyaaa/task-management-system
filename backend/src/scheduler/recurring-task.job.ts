import { RecurrenceStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { recurringService } from '../modules/recurring/recurring.service';
import { logger } from '../config/logger';

export class RecurringTaskJob {
  private static isRunning = false;

  /**
   * Executes a polling cycle for all recurring rules that are due
   */
  public static async processDueRecurrences(): Promise<number> {
    if (this.isRunning) {
      logger.warn('[RecurringTaskJob] Poller is already executing a run. Skipping cycle.');
      return 0;
    }

    this.isRunning = true;
    let spawnedCount = 0;

    try {
      const now = new Date();

      // Find all ACTIVE rules where nextOccurrence is past or present
      const dueRules = await prisma.recurrenceRule.findMany({
        where: {
          status: RecurrenceStatus.ACTIVE,
          nextOccurrence: {
            lte: now
          }
        },
        include: {
          templateTask: {
            select: { id: true, title: true, clientId: true }
          }
        }
      });

      if (dueRules.length > 0) {
        logger.info(`[RecurringTaskJob] Found ${dueRules.length} recurrence rule(s) due for generation`);
      }

      for (const rule of dueRules) {
        try {
          await recurringService.spawnInstance(rule.id, rule.nextOccurrence || now);
          spawnedCount++;
        } catch (ruleErr: any) {
          logger.error(`[RecurringTaskJob] Failed to spawn instance for rule ${rule.id}: ${ruleErr.message}`);
          // Recalculate next occurrence anyway to prevent endless retry loops on broken rules
          try {
            await recurringService.recalculateNextOccurrence(rule.id);
          } catch (recalcErr: any) {
            logger.error(`[RecurringTaskJob] Could not recalculate next occurrence for rule ${rule.id}`);
          }
        }
      }
    } catch (err: any) {
      logger.error(`[RecurringTaskJob] Error during recurrence poller execution: ${err.message}`);
    } finally {
      this.isRunning = false;
    }

    return spawnedCount;
  }
}
