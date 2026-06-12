import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { InvitationService } from './invitation.service';
import { SendInvitationDto, RespondInvitationDto } from './dto/invitation.dto';

@ApiTags('Invitations')
@Controller('invitation')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  /** Public — fetch invitation details by token (shown on the response page before login) */
  @Get('token/:token')
  @ApiOperation({ summary: 'Get invitation by token' })
  @ApiParam({ name: 'token', type: String })
  async getByToken(@Param('token') token: string) {
    return this.invitationService.getInvitationByToken(token);
  }

  /** Authenticated — respond to an invitation */
  @Post('respond')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Accept or reject an invitation' })
  async respond(@CurrentUser() user: User, @Body() dto: RespondInvitationDto) {
    return this.invitationService.respondToInvitation(user, dto);
  }

  /** Authenticated — list my pending invitations */
  @Get('mine')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my pending invitations' })
  async getMine(@CurrentUser() user: User) {
    return this.invitationService.getMyInvitations(user);
  }
}

@ApiTags('Invitations')
@Controller('vault/:vaultId/invite')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class VaultInvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @ApiOperation({ summary: 'Send a vault invitation to a user (owner only)' })
  @ApiParam({ name: 'vaultId', type: String })
  async send(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Body() dto: SendInvitationDto,
  ) {
    return this.invitationService.sendInvitation(user, vaultId, dto);
  }
}
