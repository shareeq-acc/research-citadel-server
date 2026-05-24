import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { StorageService } from './storage.service';

@Controller('storage')
@UseGuards(AuthGuard)
@ApiTags('Storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}
}
