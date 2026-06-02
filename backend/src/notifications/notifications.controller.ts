import { Controller, Get, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(@CurrentUser('tenantId') tenantId: number) {
    return this.service.findAll(tenantId);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('tenantId') tenantId: number) {
    return this.service.countUnread(tenantId).then((count) => ({ count }));
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser('tenantId') tenantId: number) {
    return this.service.markRead(id, tenantId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('tenantId') tenantId: number) {
    return this.service.markAllRead(tenantId);
  }
}
