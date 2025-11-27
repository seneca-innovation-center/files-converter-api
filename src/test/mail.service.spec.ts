import { MailerService } from '@nestjs-modules/mailer';

import { MailService } from '../modules/mail/services/mail.service';

import { createConfigServiceMock } from './utils/config-service.mock';

describe('MailService', () => {
  const sendMailMock = jest.fn().mockResolvedValue(undefined);
  const mailerServiceMock = {
    sendMail: sendMailMock,
  } as unknown as MailerService;

  it('should send email using provided template', async () => {
    const configMock = createConfigServiceMock({
      FRONTEND_LOGIN_URL: 'https://example.com/login',
    });

    const service = new MailService(mailerServiceMock, configMock);

    await service.sendEmail('test@example.com', 'Ada', 'Lovelace');

    expect(sendMailMock).toHaveBeenCalled();
  });
});
