import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export type Mail = { to: string; subject: string; text: string; html: string };

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** A short email with one button; `lines` are paragraphs of plain text */
export function linkMail(to: string, subject: string, lines: string[], button: string, url: string): Mail {
  const paragraphs = lines.map((l) => `<p style="margin:0 0 14px;line-height:1.8">${escapeHtml(l)}</p>`).join('');
  return {
    to,
    subject,
    text: [...lines, '', `${button}：${url}`].join('\n'),
    html: `<div style="font-family:'Noto Sans TC',sans-serif;color:#2b3a67;max-width:520px">${paragraphs}
<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#2b3a67;color:#ffffff;text-decoration:none">${escapeHtml(button)}</a></p>
<p style="margin:0;font-size:12px;color:#5d6b8f;word-break:break-all">如果按鈕無法使用，請把這個網址貼到瀏覽器：${escapeHtml(url)}</p></div>`,
  };
}

/**
 * Sends email through SMTP (SMTP_HOST, …). Without SMTP_HOST, e.g. on a
 * developer's machine, the message is written to the log instead, so links
 * can still be followed.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter | null;
  private readonly from: string;
  /** Public address of the web site, used in links */
  readonly webBaseUrl: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('MAIL_FROM') || 'Bible On Air <no-reply@localhost>';
    this.webBaseUrl = (config.get<string>('WEB_BASE_URL') || 'http://localhost:3000').replace(/\/$/, '');
    this.transport = host
      ? createTransport({
          host,
          port: Number(config.get('SMTP_PORT') || 587),
          secure: config.get('SMTP_SECURE') === 'true',
          auth: config.get('SMTP_USER')
            ? { user: config.get<string>('SMTP_USER'), pass: config.get<string>('SMTP_PASS') }
            : undefined,
        })
      : null;
  }

  get enabled(): boolean {
    return this.transport !== null;
  }

  /** Resolves true when the message was handed to the SMTP server */
  async send(mail: Mail): Promise<boolean> {
    if (!this.transport) {
      this.logger.log(`(SMTP not configured) To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}`);
      return false;
    }
    try {
      await this.transport.sendMail({ from: this.from, ...mail });
      return true;
    } catch (e) {
      this.logger.error(`Could not send "${mail.subject}" to ${mail.to}: ${(e as Error).message}`);
      return false;
    }
  }
}
