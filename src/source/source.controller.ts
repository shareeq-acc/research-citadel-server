import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiResponse } from 'src/common/types';
import { SourceService } from './source.service';
import { CreateSourceDto, UpdateSourceDto } from './dto';
import { SourceSelect } from './queries';
import { MulterFile } from 'src/common/types';

@Controller('vault/:vaultId/source')
@ApiTags('Source')
@UseGuards(AuthGuard)
export class SourceController {
  constructor(private readonly sourceService: SourceService) {}

  @Post()
  @ApiOperation({
    summary: 'Create Source',
    description:
      'Create a source from formData. If a file is included: uploads it to Cloudflare R2 first, stores the URL in DB (File table), then creates the Source linked to that file. If no file: creates source with metadata only (optional fileId for existing vault file). Only CONTRIBUTOR or OWNER can create.',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description:
      'FormData: title (required), optional file, authors, publication, year, externalUrl, sourceType, abstract, keywords. Or JSON body when no file.',
    schema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', example: 'Attention Is All You Need' },
        authors: { type: 'array', items: { type: 'string' }, description: 'JSON array or comma-separated' },
        publication: { type: 'string', example: 'NeurIPS' },
        year: { type: 'number', example: 2017 },
        externalUrl: { type: 'string', example: 'https://arxiv.org/abs/1706.03762' },
        sourceType: { type: 'string', enum: ['PDF', 'WEB_ARTICLE', 'DATASET', 'VIDEO', 'BOOK', 'OTHER'] },
        fileId: { type: 'string', format: 'uuid', description: 'Link to existing file in vault (when not uploading)' },
        abstract: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
        file: { type: 'string', format: 'binary', description: 'File to upload (PDF, DOCX, image, etc.) – uploaded to Cloudflare R2, then URL stored in DB' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  async create(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Body() createSourceDto: CreateSourceDto,
    @UploadedFile() file?: MulterFile,
  ): Promise<ApiResponse<SourceSelect>> {
    if (file?.buffer) {
      return this.sourceService.createWithFile(user, vaultId, createSourceDto, file);
    }
    return this.sourceService.create(user, vaultId, createSourceDto);
  }

  @Get()
  @ApiOperation({ summary: 'List Sources', description: 'Get paginated list of sources in the vault. Requires vault membership.' })
  @ApiProperty({
    title: 'List Sources',
    description: 'Get paginated list of sources in the vault. Requires vault membership.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Items per page (default: 20, max: 100)' })
  async findAll(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<
    ApiResponse<{ sources: SourceSelect[]; total: number; page: number; limit: number }>
  > {
    return this.sourceService.findAllByVault(user, vaultId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Source', description: 'Get a single source by ID. Requires vault membership.' })
  @ApiProperty({
    title: 'Get Source',
    description: 'Get a single source by ID. Requires vault membership.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'id', type: String, description: 'Source ID' })
  async findOne(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<SourceSelect>> {
    return this.sourceService.findOne(user, vaultId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update Source', description: 'Update a source. Only CONTRIBUTOR or OWNER can update.' })
  @ApiProperty({
    title: 'Update Source',
    description: 'Update a source. Only CONTRIBUTOR or OWNER can update.',
    type: UpdateSourceDto,
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'id', type: String, description: 'Source ID' })
  async update(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('id') id: string,
    @Body() updateSourceDto: UpdateSourceDto,
  ): Promise<ApiResponse<SourceSelect>> {
    return this.sourceService.update(user, vaultId, id, updateSourceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Source', description: 'Soft-delete a source. Only CONTRIBUTOR or OWNER can delete.' })
  @ApiProperty({
    title: 'Delete Source',
    description: 'Soft-delete a source. Only CONTRIBUTOR or OWNER can delete.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'id', type: String, description: 'Source ID' })
  async remove(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.sourceService.remove(user, vaultId, id);
  }

  @Post(':id/summarize')
  @ApiOperation({
    summary: 'Generate AI Summary',
    description: 'Generate an AI-powered summary of the source document. Requires extracted text from the document. Only CONTRIBUTOR or OWNER can generate summaries.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'id', type: String, description: 'Source ID' })
  @ApiBody({
    description: 'Summary generation options',
    schema: {
      type: 'object',
      properties: {
        length: {
          type: 'string',
          enum: ['short', 'medium', 'long'],
          default: 'medium',
          description: 'Desired summary length: short (100-150 words), medium (250-350 words), long (500-700 words)',
        },
      },
    },
  })
  async generateSummary(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('id') id: string,
    @Body() body: { length?: 'short' | 'medium' | 'long' },
  ): Promise<ApiResponse<SourceSelect>> {
    return this.sourceService.generateSummary(user, vaultId, id, body.length);
  }

  @Post(':id/extract-insights')
  @ApiOperation({
    summary: 'Extract AI Insights',
    description: 'Extract structured insights from the source document: research problem, methodology, key findings, limitations, future work, contributions, and datasets. Only CONTRIBUTOR or OWNER can extract insights.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'id', type: String, description: 'Source ID' })
  async extractInsights(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<SourceSelect>> {
    return this.sourceService.extractInsights(user, vaultId, id);
  }

  @Post(':id/process-for-qa')
  @ApiOperation({
    summary: 'Process Source for Q&A',
    description: 'Chunk the source text and generate vector embeddings for semantic search. Required before asking questions about this source. Only CONTRIBUTOR or OWNER can process sources.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'id', type: String, description: 'Source ID' })
  async processForQa(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ sourceId: string; chunksCreated: number }>> {
    return this.sourceService.processForQa(user, vaultId, id);
  }

  @Post(':id/extract-and-index')
  @ApiOperation({
    summary: 'Extract Text and Index for Q&A',
    description:
      'One-shot endpoint: downloads the attached file, extracts text (if not already done), then chunks and indexes the source for Q&A. Use this when process-for-qa fails with "No extracted text available". Only CONTRIBUTOR or OWNER can run this.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'id', type: String, description: 'Source ID' })
  async extractAndIndex(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ sourceId: string; chunksCreated: number; wordsExtracted: number }>> {
    return this.sourceService.extractAndIndex(user, vaultId, id);
  }
}
