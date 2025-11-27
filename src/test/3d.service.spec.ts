import { ThreeDService } from '../modules/3d/services/3d.service';

import { createConfigServiceMock } from './utils/config-service.mock';

describe('ThreeDService', () => {
  it('should be defined', () => {
    const service = new ThreeDService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
