import cron from 'node-cron';
import { RecurringTaskJob } from './recurring-task.job';
import { logger } from '../config/logger';

export class Scheduler {
  private static tasksRunner: cron.ScheduledTask | null = null;

  public static start() {
    logger.info('[Scheduler] Starting background jobs...');

    // Run the recurring task poller every minute
    // You can configure this cron expression from env if needed
    this.tasksRunner = cron.schedule('* * * * *', async () => {
      try {
        await RecurringTaskJob.processDueRecurrences();
      } catch (err: any) {
        logger.error(`[Scheduler] Uncaught error in recurring task poller: ${err.message}`);
      }
    });

    logger.info('[Scheduler] Background jobs started');
  }

  public static stop() {
    if (this.tasksRunner) {
      this.tasksRunner.stop();
      this.tasksRunner = null;
      logger.info('[Scheduler] Background jobs stopped');
    }
  }
}
