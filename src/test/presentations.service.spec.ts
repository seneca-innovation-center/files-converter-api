import { PresentationsService } from '../modules/presentations/services/presentations.service';

import { createConfigServiceMock } from './utils/config-service.mock';

describe('PresentationsService', () => {
  it('should be defined', () => {
    const service = new PresentationsService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
