import { ArchivesService } from '../modules/archives/services/archives.service';

import { createConfigServiceMock } from './utils/config-service.mock';

describe('ArchivesService', () => {
  it('should be defined', () => {
    const service = new ArchivesService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
