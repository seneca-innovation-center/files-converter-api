import { QrService } from '../modules/qr/services/qr.service';

import { createConfigServiceMock } from './utils/config-service.mock';

describe('QrService', () => {
  it('should be defined', () => {
    const service = new QrService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
