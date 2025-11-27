import { CodeService } from '../modules/code/services/code.service';

import { createConfigServiceMock } from './utils/config-service.mock';

jest.mock('prettier', () => ({
  format: jest.fn().mockResolvedValue('formatted'),
}));

describe('CodeService', () => {
  it('should be defined', () => {
    const service = new CodeService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
