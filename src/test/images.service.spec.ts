import { ImagesService } from '../modules/images/services/images.service';

import { createConfigServiceMock } from './utils/config-service.mock';

describe('ImagesService', () => {
  it('should be defined', () => {
    const service = new ImagesService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
