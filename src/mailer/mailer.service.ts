import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { Transporter, createTransport } from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { OtpType } from '@prisma/client';
import { throwError } from 'src/common/utils/helpers';

@Injectable()
export class MailerService {
  private readonly transporter: Transporter;
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.transporter = createTransport({
      pool: true,
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendVaultInvitationEmail(payload: {
    toEmail: string;
    toName: string;
    senderName: string;
    vaultName: string;
    role: string;
    token: string;
    expiresAt: Date;
  }) {
    const baseDomain = this.configService.get<string>('BASE_DOMAIN') ?? 'http://localhost:3000';
    const encodedToken = encodeURIComponent(payload.token);
    const acceptUrl = `${baseDomain}/invitation/${encodedToken}?action=ACCEPTED`;
    const rejectUrl = `${baseDomain}/invitation/${encodedToken}?action=REJECTED`;
    const viewUrl   = `${baseDomain}/invitation/${encodedToken}`;
    const expiry    = payload.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vault Invitation</title></head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:3px solid #0A0A0A;box-shadow:6px 6px 0px #0A0A0A;border-radius:4px;overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:#FACC15;border-bottom:3px solid #0A0A0A;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-family:'Courier New',monospace;font-size:11px;font-weight:900;letter-spacing:3px;color:#0A0A0A;text-transform:uppercase;">RESEARCH CITADEL</span>
                <div style="font-size:20px;font-weight:900;color:#0A0A0A;margin-top:4px;text-transform:uppercase;letter-spacing:-0.5px;">Vault Invitation</div>
              </td>
              <td align="right">
                <span style="background:#0A0A0A;color:#FACC15;font-size:10px;font-weight:900;font-family:'Courier New',monospace;padding:4px 10px;letter-spacing:2px;text-transform:uppercase;">INVITE</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:13px;color:#555;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;">Hello, ${payload.toName}</p>
          <p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;font-weight:700;line-height:1.5;">
            <strong>${payload.senderName}</strong> has invited you to collaborate on the vault
            <strong style="background:#FAFAF8;border:2px solid #0A0A0A;padding:2px 8px;font-family:'Courier New',monospace;">${payload.vaultName}</strong>
            with the role of <strong style="text-transform:uppercase;">${payload.role}</strong>.
          </p>

          <!-- Role badge -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr>
              <td style="background:#F5F5F0;border:2px solid #0A0A0A;padding:12px 20px;box-shadow:3px 3px 0 #0A0A0A;">
                <span style="font-family:'Courier New',monospace;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;">Assigned Role</span>
                <div style="font-size:18px;font-weight:900;color:#0A0A0A;margin-top:4px;text-transform:uppercase;">${payload.role}</div>
              </td>
            </tr>
          </table>

          <!-- CTA Buttons -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="padding-right:12px;">
                <a href="${acceptUrl}" style="display:inline-block;background:#0A0A0A;color:#FACC15;font-family:'Courier New',monospace;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:2px;padding:14px 28px;text-decoration:none;border:2px solid #0A0A0A;box-shadow:4px 4px 0 #555;">
                  ✓ ACCEPT INVITATION
                </a>
              </td>
              <td>
                <a href="${rejectUrl}" style="display:inline-block;background:#ffffff;color:#0A0A0A;font-family:'Courier New',monospace;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:2px;padding:14px 28px;text-decoration:none;border:2px solid #0A0A0A;box-shadow:4px 4px 0 #0A0A0A;">
                  ✕ DECLINE
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 8px;font-size:12px;color:#777;font-family:'Courier New',monospace;">
            Or visit: <a href="${viewUrl}" style="color:#0A0A0A;font-weight:700;">${viewUrl}</a>
          </p>
          <p style="margin:0;font-size:11px;color:#999;font-family:'Courier New',monospace;">
            This invitation expires on <strong>${expiry}</strong>.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F5F5F0;border-top:2px solid #0A0A0A;padding:16px 32px;">
          <p style="margin:0;font-size:10px;color:#888;font-family:'Courier New',monospace;text-align:center;text-transform:uppercase;letter-spacing:1px;">
            Research Citadel · Automated system message · Do not reply
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL'),
      to: payload.toEmail,
      subject: `Research Citadel — You've been invited to "${payload.vaultName}"`,
      html,
    });
  }

  async sendInvitationResponseEmail(payload: {
    toEmail: string;
    toName: string;
    respondentName: string;
    vaultName: string;
    action: 'accepted' | 'rejected';
  }) {
    const isAccepted = payload.action === 'accepted';
    const statusColor  = isAccepted ? '#10B981' : '#EF4444';
    const statusBg     = isAccepted ? '#D1FAE5' : '#FEE2E2';
    const statusLabel  = isAccepted ? 'ACCEPTED' : 'DECLINED';
    const statusIcon   = isAccepted ? '✓' : '✕';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invitation Response</title></head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:3px solid #0A0A0A;box-shadow:6px 6px 0px #0A0A0A;border-radius:4px;overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:#FACC15;border-bottom:3px solid #0A0A0A;padding:24px 32px;">
          <span style="font-family:'Courier New',monospace;font-size:11px;font-weight:900;letter-spacing:3px;color:#0A0A0A;text-transform:uppercase;">RESEARCH CITADEL</span>
          <div style="font-size:20px;font-weight:900;color:#0A0A0A;margin-top:4px;text-transform:uppercase;">Invitation Response</div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 20px;font-size:16px;color:#0A0A0A;font-weight:700;line-height:1.5;">
            Hi <strong>${payload.toName}</strong>,
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
            <strong>${payload.respondentName}</strong> has responded to your invitation to join
            <strong style="font-family:'Courier New',monospace;">${payload.vaultName}</strong>.
          </p>

          <!-- Status badge -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr>
              <td style="background:${statusBg};border:2px solid ${statusColor};padding:14px 24px;box-shadow:3px 3px 0 ${statusColor};">
                <span style="font-family:'Courier New',monospace;font-size:20px;font-weight:900;color:${statusColor};">
                  ${statusIcon} ${statusLabel}
                </span>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:13px;color:#777;line-height:1.6;">
            ${isAccepted
              ? `${payload.respondentName} has joined your vault. They now have access as a member.`
              : `${payload.respondentName} has declined your invitation. You can invite them again or choose a different collaborator.`
            }
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F5F5F0;border-top:2px solid #0A0A0A;padding:16px 32px;">
          <p style="margin:0;font-size:10px;color:#888;font-family:'Courier New',monospace;text-align:center;text-transform:uppercase;letter-spacing:1px;">
            Research Citadel · Automated system message · Do not reply
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL'),
      to: payload.toEmail,
      subject: `Research Citadel — ${payload.respondentName} has ${payload.action} your invitation`,
      html,
    });
  }

  async sendEmailVerificationEmail(email: string, name: string, token: string) {
    const baseDomain = this.configService.get<string>('BASE_DOMAIN') ?? 'http://localhost:3000';
    const verifyUrl = `${baseDomain}/verify-email/${encodeURIComponent(token)}`;
    const expiryHours = 24;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify Your Email</title></head>
<body style="margin:0;padding:0;background:#FFFDF0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFDF0;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:4px solid #0A0A0A;box-shadow:8px 8px 0px #0A0A0A;border-radius:2px;overflow:hidden;">

      <tr>
        <td style="background:#FFD700;border-bottom:4px solid #0A0A0A;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-family:'Courier New',monospace;font-size:11px;font-weight:900;letter-spacing:3px;color:#0A0A0A;text-transform:uppercase;">RESEARCH CITADEL</span>
                <div style="font-size:20px;font-weight:900;color:#0A0A0A;margin-top:4px;text-transform:uppercase;letter-spacing:-0.5px;">Verify Your Email</div>
              </td>
              <td align="right">
                <span style="background:#0A0A0A;color:#FFD700;font-size:10px;font-weight:900;font-family:'Courier New',monospace;padding:4px 10px;letter-spacing:2px;text-transform:uppercase;">VERIFY</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:13px;color:#555;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;">Hello, ${name}</p>
          <p style="margin:0 0 24px;font-size:16px;color:#0A0A0A;font-weight:700;line-height:1.5;">
            Welcome to <strong>Research Citadel</strong>. Click the button below to verify your email address and activate your scholar workspace.
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr>
              <td>
                <a href="${verifyUrl}" style="display:inline-block;background:#FFD700;color:#0A0A0A;font-family:'Courier New',monospace;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:2px;padding:16px 32px;text-decoration:none;border:3px solid #0A0A0A;box-shadow:4px 4px 0 #0A0A0A;">
                  ✓ VERIFY EMAIL ADDRESS
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 8px;font-size:12px;color:#777;font-family:'Courier New',monospace;line-height:1.6;">
            Or copy and paste this link into your browser:
          </p>
          <p style="margin:0 0 24px;font-size:11px;color:#0A0A0A;font-family:'Courier New',monospace;word-break:break-all;background:#F0EDE0;border:2px solid #0A0A0A;padding:12px;">
            ${verifyUrl}
          </p>
          <p style="margin:0;font-size:11px;color:#999;font-family:'Courier New',monospace;">
            This link expires in <strong>${expiryHours} hours</strong>. If you did not create an account, you can safely ignore this email.
          </p>
        </td>
      </tr>

      <tr>
        <td style="background:#F0EDE0;border-top:3px solid #0A0A0A;padding:16px 32px;">
          <p style="margin:0;font-size:10px;color:#888;font-family:'Courier New',monospace;text-align:center;text-transform:uppercase;letter-spacing:1px;">
            Research Citadel · Automated system message · Do not reply
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_FROM'),
      to: email,
      subject: 'Research Citadel — Verify your email address',
      html,
    });
  }

  async sendOtpEmail(email: string, otp: string, type: OtpType) {
    try {
      let subject = '';
      if (type === OtpType.EMAIL_VERIFICATION) {
        subject = `ResearchCitadel | Verify your account`;
      } else if (type === OtpType.PASSWORD_RESET) {
        subject = `ResearchCitadel | Reset Password`;
      } else {
        console.info('Unsupported OTP type');
        return;
      }

      const purposeText = type === OtpType.EMAIL_VERIFICATION ? 'verify your email address' : 'reset your password';
      const instructionText =
        type === OtpType.EMAIL_VERIFICATION
          ? 'Please use the verification code below to complete your account verification.'
          : 'Please use the code below to reset your password. This code will expire in 10 minutes.';

      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f0f; color: #e0e0e0;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #0f0f0f;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #1a1a1a; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
                <tr>
                  <td style="padding: 50px 40px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #ffffff; letter-spacing: -0.5px;">ResearchCitadel</h1>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 40px;">
                          <h2 style="margin: 0; font-size: 22px; font-weight: 500; color: #ffffff; line-height: 1.4;">
                            ${type === OtpType.EMAIL_VERIFICATION ? 'Verify Your Account' : 'Reset Your Password'}
                          </h2>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #b0b0b0; max-width: 500px;">
                            To ${purposeText}, ${instructionText}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding: 30px 0;">
                          <div style="display: inline-block; background-color: #2a2a2a; border: 2px solid #3a3a3a; border-radius: 8px; padding: 30px 40px; min-width: 200px;">
                            <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace; text-align: center;">
                              ${otp}
                            </p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 20px; padding-bottom: 40px;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #808080; max-width: 500px;">
                            If you did not request this code, please ignore this email or contact our support team if you have concerns.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 1px solid #2a2a2a; padding-top: 30px;">
                          <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #666666; text-align: center;">
                            This is an automated message, please do not reply to this email.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;

      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        html,
        subject,
      };

      const mailResponse = await this.transporter.sendMail(mailOptions);
      return mailResponse;
    } catch (error) {
      throw throwError(error.message || 'Failed to send OTP email', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async sendAlertEmail(payload: {
    toEmail: string;
    toName: string;
    title: string;
    description: string;
    linkPath?: string;
  }) {
    const baseDomain = this.configService.get<string>('BASE_DOMAIN') ?? 'http://localhost:3000';
    const actionUrl = payload.linkPath ? `${baseDomain}${payload.linkPath}` : `${baseDomain}/dashboard`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${payload.title}</title></head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:3px solid #0A0A0A;box-shadow:6px 6px 0px #0A0A0A;border-radius:4px;overflow:hidden;">
      <tr>
        <td style="background:#FACC15;border-bottom:3px solid #0A0A0A;padding:24px 32px;">
          <span style="font-family:'Courier New',monospace;font-size:11px;font-weight:900;letter-spacing:3px;color:#0A0A0A;text-transform:uppercase;">RESEARCH CITADEL</span>
          <div style="font-size:20px;font-weight:900;color:#0A0A0A;margin-top:4px;text-transform:uppercase;letter-spacing:-0.5px;">${payload.title}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:13px;color:#555;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;">Hello, ${payload.toName}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#0A0A0A;line-height:1.6;">${payload.description}</p>
          <a href="${actionUrl}" style="display:inline-block;background:#FACC15;color:#0A0A0A;font-weight:900;font-size:12px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:1px;padding:12px 24px;border:3px solid #0A0A0A;box-shadow:4px 4px 0 #0A0A0A;text-decoration:none;">View in Citadel</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

    await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_FROM'),
      to: payload.toEmail,
      subject: `[Research Citadel] ${payload.title}`,
      html,
    });
  }
}
