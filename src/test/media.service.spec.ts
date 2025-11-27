import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { ConfigService } from '@nestjs/config';

import { MediaService } from '../modules/media/services/media.service';

describe('MediaService file helpers', () => {
  const tempDirectory = tmpdir();
  let service: MediaService;

  beforeEach(() => {
    service = new MediaService(new ConfigService());
  });

  it('should read a file buffer via getFileBuffer', async () => {
    const filePath = join(tempDirectory, `media-test-${Date.now()}-buffer.txt`);
    const content = 'test-buffer';

    await fs.writeFile(filePath, content, 'utf8');

    const buffer = await service.getFileBuffer(filePath);
    expect(buffer.toString('utf8')).toBe(content);

    await fs.unlink(filePath);
  });

  it('should delete an existing file via deleteFile', async () => {
    const filePath = join(tempDirectory, `media-test-${Date.now()}-delete.txt`);
    await fs.writeFile(filePath, 'delete-me', 'utf8');

    await service.deleteFile(filePath);

    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it('should ignore missing files when deleteFile is called', async () => {
    const missingPath = join(
      tempDirectory,
      `media-test-${Date.now()}-missing.txt`,
    );

    await expect(service.deleteFile(missingPath)).resolves.toBeUndefined();
  });
});
