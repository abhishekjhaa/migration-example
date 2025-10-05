import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MigrationService } from './migration.service';

@ApiTags('Migration')
@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get('validate')
  @ApiOperation({ summary: 'Validate migration results' })
  @ApiResponse({ status: 200, description: 'Migration validation completed.' })
  async validateMigration() {
    return this.migrationService.validateMigration();
  }
}
