import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { User } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiResponse } from 'src/common/types';
import { CitationService } from './citation.service';
import { CreateCitationDto, UpdateCitationDto } from './dto';
import { CitationSelect } from './queries';

@Controller('vault/:vaultId/source/:sourceId/citation')
@ApiTags('Citation')
@UseGuards(AuthGuard)
export class CitationController {
  constructor(private readonly citationService: CitationService) {}

  @Post()
  @ApiOperation({
    summary: 'Create or Update Citation',
    description:
      'Set a formatted citation for a source and format (APA, MLA, etc.). One citation per format per source; same format upserts. Only CONTRIBUTOR or OWNER can create or edit.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'sourceId', type: String, description: 'Source ID' })
  async create(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('sourceId') sourceId: string,
    @Body() createCitationDto: CreateCitationDto,
  ): Promise<ApiResponse<CitationSelect>> {
    return this.citationService.create(user, vaultId as string, sourceId as string, createCitationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List Citations',
    description: 'Get all citations for a source (one per format). Requires vault membership.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'sourceId', type: String, description: 'Source ID' })
  @ApiProperty({
    title: 'List Citations',
    description: 'Get all citation formats for the source.',
  })
  async findAll(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('sourceId') sourceId: string,
  ): Promise<ApiResponse<CitationSelect[]>> {
    return this.citationService.findAllBySource(user, vaultId as string, sourceId as string);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Citation',
    description: 'Get a single citation by ID. Requires vault membership.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'sourceId', type: String, description: 'Source ID' })
  @ApiParam({ name: 'id', type: String, description: 'Citation ID' })
  @ApiProperty({
    title: 'Get Citation',
    description: 'Get a single citation by ID.',
  })
  async findOne(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('sourceId') sourceId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<CitationSelect>> {
    return this.citationService.findOne(user, vaultId as string, sourceId as string, id as string);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update Citation',
    description: 'Update the citation text. Only CONTRIBUTOR or OWNER can update.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'sourceId', type: String, description: 'Source ID' })
  @ApiParam({ name: 'id', type: String, description: 'Citation ID' })
  @ApiProperty({
    title: 'Update Citation',
    description: 'Update the formatted citation string.',
    type: UpdateCitationDto,
  })
  async update(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('sourceId') sourceId: string,
    @Param('id') id: string,
    @Body() updateCitationDto: UpdateCitationDto,
  ): Promise<ApiResponse<CitationSelect>> {
    return this.citationService.update(user, vaultId as string, sourceId as string, id as string, updateCitationDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Citation',
    description: 'Delete a citation. Only CONTRIBUTOR or OWNER can delete.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'sourceId', type: String, description: 'Source ID' })
  @ApiParam({ name: 'id', type: String, description: 'Citation ID' })
  @ApiProperty({
    title: 'Delete Citation',
    description: 'Delete a citation.',
  })
  async remove(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('sourceId') sourceId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.citationService.remove(user, vaultId as string, sourceId as string, id as string);
  }
}
