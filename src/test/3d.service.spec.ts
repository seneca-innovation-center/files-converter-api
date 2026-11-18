// @gltf-transform ships ESM only, which ts-jest (CommonJS) can't load.
// This spec only checks construction, so stub the modules out.
jest.mock('@gltf-transform/core', () => ({}));
jest.mock('@gltf-transform/extensions', () => ({}));
jest.mock('@gltf-transform/functions', () => ({}));

import { ThreeDService } from '../modules/3d/services/3d.service';

import { createConfigServiceMock } from './utils/config-service.mock';

describe('ThreeDService', () => {
  it('should be defined', () => {
    const service = new ThreeDService(createConfigServiceMock());
    expect(service).toBeDefined();
  });
});
