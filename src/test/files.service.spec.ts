import { FilesService } from '../modules/files/services/files.service';

import { createConfigServiceMock } from './utils/config-service.mock';

describe('FilesService', () => {
  it('should be defined', () => {
    const service = new FilesService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
