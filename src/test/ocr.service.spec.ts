import { OcrService } from '../modules/ocr/services/ocr.service';

import { createConfigServiceMock } from './utils/config-service.mock';

describe('OcrService', () => {
  it('should be defined', () => {
    const service = new OcrService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
