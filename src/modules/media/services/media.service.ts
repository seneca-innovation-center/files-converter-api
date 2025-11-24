import { promises as fs } from 'fs';
import { join } from 'path';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ffmpeg from 'fluent-ffmpeg';

import { ConvertMediaDto } from '../dtos/convert-media.dto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

ffmpeg.setFfmpegPath(ffmpegPath as string);

/**
 * Service for video and audio conversion using FFmpeg
 */
@Injectable()
export class MediaService {
  private readonly tmpDir: string;

  constructor(private readonly configService: ConfigService) {
    this.tmpDir = process.env.TMP_DIR || '/tmp';
  }

  /**
   * Converts media file to target format
   * @param fileBuffer Media file buffer
   * @param originalFilename Original filename
   * @param dto Conversion parameters
   * @returns Object containing the path to the converted file
   */
  async convertMedia(
    fileBuffer: Buffer,
    originalFilename: string,
    dto: ConvertMediaDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const inputPath = join(this.tmpDir, `input_${timestamp}_${randomString}`);
    const filename = `converted_${timestamp}_${randomString}.${dto.targetFormat}`;
    const outputPath = join(this.tmpDir, filename);

    try {
      // Write input buffer to temporary file
      await fs.writeFile(inputPath, fileBuffer);

      // Perform conversion
      await this.convertWithFfmpeg(inputPath, outputPath, dto);

      // Determine MIME type
      const mimeType = this.getMimeType(dto.targetFormat);

      return {
        filePath: outputPath,
        filename,
        mimeType,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Media conversion failed: ' + (error as Error).message,
      );
    } finally {
      // Clean up input file
      try {
        await fs.unlink(inputPath);
      } catch (_error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Extracts audio from video
   * @param fileBuffer Video file buffer
   * @param audioFormat Target audio format
   * @returns Object containing the path to the audio file
   */
  async extractAudio(
    fileBuffer: Buffer,
    audioFormat: string,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const inputPath = join(this.tmpDir, `input_${timestamp}_${randomString}`);
    const filename = `audio_${timestamp}_${randomString}.${audioFormat}`;
    const outputPath = join(this.tmpDir, filename);

    try {
      await fs.writeFile(inputPath, fileBuffer);

      // First, check if the file has an audio stream
      const hasAudio = await this.checkAudioStream(inputPath);
      if (!hasAudio) {
        throw new Error(
          'The input file does not contain any audio stream. Please provide a video file with audio or an audio file.',
        );
      }

      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg(inputPath)
          .noVideo() // Remove video stream
          .audioChannels(2) // Stereo
          .audioFrequency(44100); // Standard sample rate

        // Set appropriate audio codec based on format
        const audioCodec = this.getAudioCodec(audioFormat);
        if (audioCodec) {
          command.audioCodec(audioCodec);
        }

        // Set audio quality/bitrate
        if (audioFormat === 'mp3') {
          command.audioBitrate('192k');
        }

        command
          .toFormat(audioFormat)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .save(outputPath);
      });

      const mimeType = this.getMimeType(audioFormat);

      return {
        filePath: outputPath,
        filename,
        mimeType,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Audio extraction failed: ' + (error as Error).message,
      );
    } finally {
      try {
        await fs.unlink(inputPath);
      } catch (_error) {
        // Ignore
      }
    }
  }

  private async checkAudioStream(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          resolve(false);
          return;
        }

        // Check if there's at least one audio stream
        const hasAudio = metadata.streams.some(
          (stream) => stream.codec_type === 'audio',
        );
        resolve(hasAudio);
      });
    });
  }

  private convertWithFfmpeg(
    inputPath: string,
    outputPath: string,
    dto: ConvertMediaDto,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // Apply video codec if specified
      if (dto.videoCodec) {
        command = command.videoCodec(dto.videoCodec);
      }

      // Apply audio codec if specified
      if (dto.audioCodec) {
        command = command.audioCodec(dto.audioCodec);
      }

      // Apply audio bitrate if specified
      if (dto.audioBitrate) {
        command = command.audioBitrate(dto.audioBitrate);
      }

      // Apply video bitrate if specified
      if (dto.videoBitrate) {
        command = command.videoBitrate(dto.videoBitrate);
      }

      // Apply dimensions if specified
      if (dto.width || dto.height) {
        const size =
          dto.width && dto.height
            ? `${dto.width}x${dto.height}`
            : dto.width
              ? `${dto.width}x?`
              : `?x${dto.height}`;
        command = command.size(size);
      }

      command
        .toFormat(dto.targetFormat)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });
  }

  private getAudioCodec(format: string): string | null {
    const audioCodecs: Record<string, string> = {
      mp3: 'libmp3lame',
      wav: 'pcm_s16le',
      ogg: 'libvorbis',
      flac: 'flac',
      aac: 'aac',
      m4a: 'aac',
    };
    return audioCodecs[format] || null;
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      // Video
      mp4: 'video/mp4',
      webm: 'video/webm',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      gif: 'image/gif',
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      aac: 'audio/aac',
      m4a: 'audio/mp4',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
