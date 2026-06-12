import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { NotificationEventName } from './events/notification.events';

@Injectable()
export class NotificationEventBus extends EventEmitter {
  emitEvent<T>(event: NotificationEventName, payload: T): boolean {
    return this.emit(event, payload);
  }
}
