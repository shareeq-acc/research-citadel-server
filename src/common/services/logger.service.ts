import { Injectable, LoggerService, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logsDir: string;
  private readonly logger: Logger;
  private context?: string;

  constructor(context?: string) {
    this.context = context;
    this.logger = new Logger(context || AppLoggerService.name);
    this.logsDir = join(process.cwd(), 'tmp', 'logs');
    this.ensureLogsDirectoryExists();
  }

  private ensureLogsDirectoryExists(): void {
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    return join(this.logsDir, `app-${dateString}.log`);
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private writeToFile(data: any): void {
    try {
      const timestamp = this.formatTimestamp();
      const logEntry = {
        timestamp,
        data,
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      const logFile = this.getLogFileName();
      appendFileSync(logFile, logLine, 'utf8');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  log(message: string, context?: string): void {
    this.logger.log(message, context || this.context);
    this.writeToFile({ message, context: context || this.context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, trace, context || this.context);
    this.writeToFile({ message, trace, context: context || this.context });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context || this.context);
    this.writeToFile({ message, context: context || this.context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, context || this.context);
    this.writeToFile({ message, context: context || this.context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, context || this.context);
    this.writeToFile({ message, context: context || this.context });
  }

  logData(data: any): void {
    this.writeToFile(data);
  }

  static create(context: string): AppLoggerService {
    return new AppLoggerService(context);
  }
}
