import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse as ApiResponseDoc, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { VaultService } from './vault.service';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiResponse } from 'src/common/types';
import { CreateVaultDto, UpdateVaultDto, AddVaultMemberDto, AuditLogResponseDto, AUDIT_ACTIONS, UserContributionStatsDto, VaultMemberResponseDto } from './dto';
import { VaultSelect, VaultWithMyRole, VaultWithMyRoleAndMembers, VaultMemberWithUser } from './queries';
import { AskQuestionDto, QaAnswerDto } from 'src/ai/dto/qa.dto';

@Controller('vault')
@ApiTags('Vault')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  @ApiOperation({
    summary: 'List Vaults',
    description: 'Get all vaults the logged-in user is a member of (owner or invited member). Returns vaults with your role (myRole).',
  })
  async findAll(@CurrentUser() user: User): Promise<ApiResponse<VaultWithMyRole[]>> {
    return this.vaultService.findAllByUser(user);
  }

  @Get(':id/audit')
  @ApiOperation({
    summary: 'Get Audit Logs by Vault',
    description:
      'Get audit logs for a vault. Only vault members can access. Optionally filter by action, category, or date range.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, enum: AUDIT_ACTIONS, description: 'Filter by exact action' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category: VAULT | MEMBER | FILE | SOURCE | ANNOTATION | CITATION' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'ISO date string — include logs on or after this date' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'ISO date string — include logs on or before this date' })
  @ApiResponseDoc({ status: 200, description: 'Audit logs retrieved', type: [AuditLogResponseDto] })
  async getAuditLogs(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('action') action?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ApiResponse<import('./vault.service').AuditLogEntry[]>> {
    return this.vaultService.getAuditLogsByVault(user, id, { limit, offset, action, category, startDate, endDate });
  }

  @Get(':id/stats')
  @ApiOperation({
    summary: 'Get Vault Audit Stats',
    description:
      'Get per-user contribution stats for a vault based on audit logs. Returns each user who has performed at least one action in the vault, with counts per action type (e.g. SOURCE_ADDED, ANNOTATION_ADDED) and total count. Only vault members can access.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  @ApiResponseDoc({ status: 200, description: 'Vault audit stats by user (data array of UserContributionStatsDto)', type: [UserContributionStatsDto] })
  async getVaultAuditStats(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ApiResponse<import('./vault.service').VaultAuditStatsEntry[]>> {
    return this.vaultService.getVaultAuditStats(user, id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Vault',
    description: 'Get a single vault by ID with members list. User must be a vault member (owner or invited). Returns 403 if not a member, 404 if vault not found or deleted.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ApiResponse<VaultWithMyRoleAndMembers>> {
    return this.vaultService.findOne(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create Vault',
    description: 'Create a new vault. The current user becomes the owner.',
  })
  async create(
    @CurrentUser() user: User,
    @Body() createVaultDto: CreateVaultDto,
  ): Promise<ApiResponse<VaultSelect>> {
    return this.vaultService.create(user, createVaultDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update Vault',
    description: 'Update vault name, description, or privacy. Only the vault owner can update.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  async update(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateVaultDto: UpdateVaultDto,
  ): Promise<ApiResponse<VaultSelect>> {
    return this.vaultService.update(user, id, updateVaultDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Vault',
    description: 'Soft-delete a vault. Only the vault owner can delete.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.vaultService.delete(user, id);
  }

  @Post(':id/members')
  @ApiOperation({
    summary: 'Add Vault Member',
    description: 'Add a user as a member to a vault with CONTRIBUTOR or VIEWER role. Only the vault owner can add members.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  async addMember(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() addVaultMemberDto: AddVaultMemberDto,
  ): Promise<ApiResponse<{ vaultId: string; userId: string; role: string }>> {
    return this.vaultService.addMember(user, id, addVaultMemberDto);
  }

  @Get(':id/members')
  @ApiOperation({
    summary: 'List Vault Members',
    description: 'Get all members of a vault with their role and profile details. Any vault member can access this endpoint.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  @ApiResponseDoc({ status: 200, description: 'Members retrieved', type: [VaultMemberResponseDto] })
  async getMembers(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ApiResponse<VaultMemberWithUser[]>> {
    return this.vaultService.getMembers(user, id);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({
    summary: 'Remove Vault Member',
    description: 'Remove a member from a vault. Only the vault owner can remove members. The owner cannot be removed.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  @ApiParam({ name: 'userId', type: String, description: 'UUID of the user to remove' })
  @ApiResponseDoc({ status: 200, description: 'Member removed' })
  async removeMember(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ): Promise<ApiResponse<{ removed: boolean }>> {
    return this.vaultService.removeMember(user, id, userId);
  }

  @Post(':id/ask')
  @ApiOperation({
    summary: 'Ask a Question (RAG)',
    description: 'Ask a question about the sources in this vault using semantic search and AI. Sources must be processed for Q&A first. All vault members can ask questions.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  @ApiBody({ type: AskQuestionDto })
  async askQuestion(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AskQuestionDto,
  ): Promise<ApiResponse<QaAnswerDto>> {
    return this.vaultService.askQuestion(user, id, dto.question, dto.sourceIds);
  }
}
