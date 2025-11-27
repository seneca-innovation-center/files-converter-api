import { EbooksService } from '../modules/ebooks/services/ebooks.service';

import { createConfigServiceMock } from './utils/config-service.mock';

describe('EbooksService', () => {
  it('should be defined', () => {
    const service = new EbooksService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
