import { MarkdownService } from '../modules/markdown/services/markdown.service';

import { createConfigServiceMock } from './utils/config-service.mock';

jest.mock('marked', () => {
  const parse = jest.fn().mockResolvedValue('<p>mock</p>');
  return {
    marked: {
      parse,
      setOptions: jest.fn(),
    },
  };
});

jest.mock('turndown', () => {
  const turndownInstance = {
    turndown: jest.fn().mockReturnValue('mock-markdown'),
  };
  const turndownConstructor = jest
    .fn()
    .mockImplementation(() => turndownInstance);
  return {
    __esModule: true,
    default: turndownConstructor,
  };
});

describe('MarkdownService', () => {
  it('should be defined', () => {
    const service = new MarkdownService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
