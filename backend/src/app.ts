import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from './config/env.config';
import { errorHandler } from './middleware/error.middleware';
import { sendSuccess, sendError } from './shared/utils/response.util';
import { NotFoundError } from './shared/errors/app-error';
import authRouter from './modules/auth/auth.routes';
import usersRouter from './modules/users/user.routes';
import teamsRouter from './modules/clients/client.routes';
import tasksRouter from './modules/tasks/task.routes';
import labelsRouter from './modules/labels/label.routes';
import templatesRouter from './modules/templates/template.routes';
import automationRouter from './modules/automation/automation.routes';
import workflowsRouter from './modules/workflows/workflow.routes';
import recurringRouter from './modules/recurring/recurring.routes';
import auditRouter from './modules/audit/audit.routes';
import engagementRouter from './modules/engagement/engagement.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';

export function createApp(): Express {
  const app = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. CORS Configuration
  app.use(
    cors({
      origin: [ENV.CLIENT_URL, 'http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Id']
    })
  );

  // 3. Global Rate Limiter
  const limiter = rateLimit({
    windowMs: ENV.RATE_LIMIT_WINDOW_MS,
    max: ENV.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP address, please try again later.'
      }
    }
  });
  app.use('/api/', limiter);

  // 4. Request Body Parsers
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // 5. Audit Context Middleware (Tracks IP, user-agent, request ID)
  app.use((req: Request, _res: Response, next) => {
    req.auditContext = {
      requestId: uuidv4(),
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    next();
  });

  // 6. System Health Check Routes
  app.get('/health', (_req: Request, res: Response) => {
    return sendSuccess(res, { status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.get('/api/v1/health', (_req: Request, res: Response) => {
    return sendSuccess(res, {
      status: 'UP',
      environment: ENV.NODE_ENV,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // 7. API Routes mounted
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/clients', teamsRouter);
  app.use('/api/v1/tasks', tasksRouter);
  app.use('/api/v1/labels', labelsRouter);
  app.use('/api/v1/templates', templatesRouter);
  app.use('/api/v1/automation-rules', automationRouter);
  app.use('/api/v1/workflows', workflowsRouter);
  app.use('/api/v1/recurring', recurringRouter);
  app.use('/api/v1/audit', auditRouter);
  app.use('/api/v1/engagement', engagementRouter);
  app.use('/api/v1/dashboard', dashboardRouter);

  // 8. 404 Route Catch-All
  app.use('*', (req: Request) => {
    throw new NotFoundError(`Endpoint '${req.method} ${req.originalUrl}' not found.`);
  });

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
