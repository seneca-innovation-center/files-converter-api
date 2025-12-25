import { promises as fs } from 'fs';
import { join } from 'path';

import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ffmpeg from 'fluent-ffmpeg';

import { ConvertMediaDto } from '../dtos/convert-media.dto';
import {
  TrimVideoDto,
  ExtractFrameDto,
  SubtitleOperationDto,
  TranscribeVideoDto,
} from '../dtos/video-operations.dto';

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

  /**
   * Generates thumbnail from video (first frame)
   */
  async generateThumbnail(
    fileBuffer: Buffer,
    timeInSeconds: number = 0,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const inputPath = join(this.tmpDir, `input_${timestamp}_${randomString}`);
    const filename = `thumbnail_${timestamp}_${randomString}.png`;
    const outputPath = join(this.tmpDir, filename);

    try {
      await fs.writeFile(inputPath, fileBuffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .seekInput(timeInSeconds)
          .frames(1)
          .outputOptions('-vf', 'scale=320:-1') // Resize to 320px width
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        filePath: outputPath,
        filename,
        mimeType: 'image/png',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Thumbnail generation failed: ' + (error as Error).message,
      );
    } finally {
      try {
        await fs.unlink(inputPath);
      } catch (_error) {
        // Ignore
      }
    }
  }

  /**
   * Trims/cuts video
   */
  async trimVideo(
    fileBuffer: Buffer,
    dto: TrimVideoDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const inputPath = join(this.tmpDir, `input_${timestamp}_${randomString}`);
    const filename = `trimmed_${timestamp}_${randomString}.mp4`;
    const outputPath = join(this.tmpDir, filename);

    try {
      await fs.writeFile(inputPath, fileBuffer);

      const duration = dto.endTime - dto.startTime;

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .seekInput(dto.startTime)
          .duration(duration)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        filePath: outputPath,
        filename,
        mimeType: 'video/mp4',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Video trimming failed: ' + (error as Error).message,
      );
    } finally {
      try {
        await fs.unlink(inputPath);
      } catch (_error) {
        // Ignore
      }
    }
  }

  /**
   * Merges multiple videos
   */
  async mergeVideos(
    videoBuffers: Buffer[],
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const inputPaths: string[] = [];
    const concatFilePath = join(
      this.tmpDir,
      `concat_${timestamp}_${randomString}.txt`,
    );
    const filename = `merged_${timestamp}_${randomString}.mp4`;
    const outputPath = join(this.tmpDir, filename);

    try {
      // Write all input files
      for (let i = 0; i < videoBuffers.length; i++) {
        const inputPath = join(
          this.tmpDir,
          `input_${timestamp}_${i}_${randomString}`,
        );
        await fs.writeFile(inputPath, videoBuffers[i]);
        inputPaths.push(inputPath);
      }

      // Create concat file for FFmpeg
      const concatContent = inputPaths
        .map((path) => `file '${path}'`)
        .join('\n');
      await fs.writeFile(concatFilePath, concatContent);

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy'])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Clean up input files and concat file
      for (const inputPath of inputPaths) {
        try {
          await fs.unlink(inputPath);
        } catch (_error) {
          // Ignore
        }
      }
      try {
        await fs.unlink(concatFilePath);
      } catch (_error) {
        // Ignore
      }

      return {
        filePath: outputPath,
        filename,
        mimeType: 'video/mp4',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Video merging failed: ' + (error as Error).message,
      );
    }
  }

  /**
   * Extracts frame from video
   */
  async extractFrame(
    fileBuffer: Buffer,
    dto: ExtractFrameDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const inputPath = join(this.tmpDir, `input_${timestamp}_${randomString}`);
    const format = dto.format || 'png';
    const filename = `frame_${timestamp}_${randomString}.${format}`;
    const outputPath = join(this.tmpDir, filename);

    try {
      await fs.writeFile(inputPath, fileBuffer);

      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg(inputPath);

        if (dto.time !== undefined) {
          command.seekInput(dto.time);
        } else if (dto.frameNumber !== undefined) {
          // Approximate: assume 30fps, can be improved with metadata
          const time = dto.frameNumber / 30;
          command.seekInput(time);
        } else {
          command.seekInput(0); // Default to first frame
        }

        command
          .frames(1)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        filePath: outputPath,
        filename,
        mimeType: format === 'png' ? 'image/png' : 'image/jpeg',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Frame extraction failed: ' + (error as Error).message,
      );
    } finally {
      try {
        await fs.unlink(inputPath);
      } catch (_error) {
        // Ignore
      }
    }
  }

  /**
   * Extracts or embeds subtitles
   */
  async handleSubtitles(
    fileBuffer: Buffer,
    dto: SubtitleOperationDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const inputPath = join(this.tmpDir, `input_${timestamp}_${randomString}`);

    try {
      await fs.writeFile(inputPath, fileBuffer);

      if (dto.operation === 'extract') {
        // Check if video has subtitle streams
        const hasSubtitles = await new Promise<boolean>((resolve) => {
          ffmpeg(inputPath).ffprobe((err, data) => {
            if (err) {
              resolve(false);
              return;
            }
            // Check for subtitle streams
            const subtitleStreams =
              data?.streams?.filter(
                (stream) => stream.codec_type === 'subtitle',
              ) || [];
            resolve(subtitleStreams.length > 0);
          });
        });

        if (!hasSubtitles) {
          throw new BadRequestException(
            'No subtitle streams found in the video file. The video does not contain embedded subtitles.',
          );
        }

        // Extract subtitles
        const format = dto.format || 'srt';
        const filename = `subtitles_${timestamp}_${randomString}.${format}`;
        const outputPath = join(this.tmpDir, filename);

        await new Promise<void>((resolve, reject) => {
          ffmpeg(inputPath)
            .outputOptions(['-map', '0:s:0']) // Extract first subtitle stream
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
        });

        return {
          filePath: outputPath,
          filename,
          mimeType: format === 'srt' ? 'text/plain' : 'text/vtt',
        };
      } else {
        // Embed subtitles
        if (!dto.subtitleFile && !dto.subtitleText) {
          throw new BadRequestException(
            'Subtitle file or text is required for embedding',
          );
        }

        const filename = `with_subtitles_${timestamp}_${randomString}.mp4`;
        const outputPath = join(this.tmpDir, filename);
        let subtitlePath: string | undefined;

        if (dto.subtitleFile) {
          subtitlePath = join(
            this.tmpDir,
            `subtitle_${timestamp}_${randomString}.srt`,
          );
          // subtitleFile is a Buffer from the controller
          const subtitleBuffer = Buffer.isBuffer(dto.subtitleFile)
            ? dto.subtitleFile
            : Buffer.from(dto.subtitleFile as unknown as Uint8Array);
          await fs.writeFile(subtitlePath, subtitleBuffer);
        } else if (dto.subtitleText) {
          subtitlePath = join(
            this.tmpDir,
            `subtitle_${timestamp}_${randomString}.srt`,
          );
          await fs.writeFile(subtitlePath, dto.subtitleText);
        }

        await new Promise<void>((resolve, reject) => {
          const command = ffmpeg(inputPath);
          if (subtitlePath) {
            command
              .outputOptions(['-vf', `subtitles=${subtitlePath}`])
              .output(outputPath)
              .on('end', () => resolve())
              .on('error', (err) => reject(err))
              .run();
          } else {
            reject(new Error('Subtitle path not set'));
          }
        });

        // Clean up subtitle file
        if (subtitlePath) {
          try {
            await fs.unlink(subtitlePath);
          } catch (_error) {
            // Ignore
          }
        }

        return {
          filePath: outputPath,
          filename,
          mimeType: 'video/mp4',
        };
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Subtitle operation failed: ' + (error as Error).message,
      );
    } finally {
      try {
        await fs.unlink(inputPath);
      } catch (_error) {
        // Ignore
      }
    }
  }

  /**
   * Transcribes video to text using speech recognition
   */
  async transcribeVideo(
    fileBuffer: Buffer,
    dto: TranscribeVideoDto,
  ): Promise<{ filePath: string; filename: string; mimeType: string }> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const inputPath = join(this.tmpDir, `input_${timestamp}_${randomString}`);

    try {
      await fs.writeFile(inputPath, fileBuffer);

      // First, extract audio from video
      const audioPath = join(
        this.tmpDir,
        `audio_${timestamp}_${randomString}.wav`,
      );

      // Extract audio using FFmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .inputOptions(['-ss', '0']) // Start from the very beginning
          .outputOptions([
            '-vn',
            '-acodec',
            'pcm_s16le',
            '-ar',
            '16000',
            '-ac',
            '1',
            '-avoid_negative_ts',
            'make_zero',
          ]) // Clean audio extraction
          .audioFilters('aresample=async=1') // Handle async audio properly
          .format('wav')
          .output(audioPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Use whisper-node for transcription
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const whisperModule = require('whisper-node');
      // whisper-node exports both named and default, use default or named export
      const whisper =
        whisperModule.default || whisperModule.whisper || whisperModule;
      // whisper-node returns: [{start: "00:00:14.310", end: "00:00:16.480", speech: "text"}]

      if (typeof whisper !== 'function') {
        throw new Error(
          'whisper-node is not properly installed or models are missing. Run: npx whisper-node download',
        );
      }

      // Transcribe audio
      // Note: whisper-node requires models to be downloaded first via: npx whisper-node download
      const whisperOptions: Record<string, unknown> = {
        modelName: 'medium', // Use base model (can be 'tiny', 'base', 'small', 'medium', 'large')
        whisperOptions: {
          language: dto.language || 'auto', // Use specified language or auto-detect
          word_timestamps: true, // Get timestamps for every word for better precision
        },
      };

      const result = (await whisper(audioPath, whisperOptions)) as Array<{
        start: string;
        end: string;
        speech: string;
      }>;

      // Clean up audio file
      await this.deleteFile(audioPath);

      // Format output based on requested format
      const outputFormat = dto.outputFormat || 'txt';
      let outputContent: string;
      let filename: string;
      let mimeType: string;

      if (outputFormat === 'json') {
        outputContent = JSON.stringify(result, null, 2);
        filename = `transcription_${timestamp}_${randomString}.json`;
        mimeType = 'application/json';
      } else if (outputFormat === 'srt') {
        outputContent = this.formatAsSrt(result);
        filename = `transcription_${timestamp}_${randomString}.srt`;
        mimeType = 'text/plain';
      } else if (outputFormat === 'vtt') {
        outputContent = this.formatAsVtt(result);
        filename = `transcription_${timestamp}_${randomString}.vtt`;
        mimeType = 'text/vtt';
      } else {
        // Default: plain text
        outputContent = result.map((segment) => segment.speech).join(' ');
        filename = `transcription_${timestamp}_${randomString}.txt`;
        mimeType = 'text/plain';
      }

      const filePath = join(this.tmpDir, filename);
      await fs.writeFile(filePath, outputContent);

      return {
        filePath,
        filename,
        mimeType,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Video transcription failed: ' + (error as Error).message,
      );
    } finally {
      try {
        await fs.unlink(inputPath);
      } catch (_error) {
        // Ignore
      }
    }
  }

  /**
   * Formats transcription result as SRT subtitle format
   * whisper-node returns timestamps as strings in format "HH:MM:SS.mmm"
   */
  private formatAsSrt(
    segments: Array<{ start: string; end: string; speech: string }>,
  ): string {
    const groupedSegments = this.groupSegmentsForSrt(segments, 3);
    return groupedSegments
      .map((segment, index) => {
        const startTime = segment.start.replace('.', ',');
        const endTime = segment.end.replace('.', ',');
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.speech}\n`;
      })
      .join('\n');
  }

  /**
   * Formats transcription result as VTT subtitle format
   * whisper-node returns timestamps as strings in format "HH:MM:SS.mmm"
   */
  private formatAsVtt(
    segments: Array<{ start: string; end: string; speech: string }>,
  ): string {
    const header = 'WEBVTT\n\n';
    const content = segments
      .map((segment) => {
        // VTT uses same format as whisper (HH:MM:SS.mmm)
        return `${segment.start} --> ${segment.end}\n${segment.speech}\n`;
      })
      .join('\n');
    return header + content;
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

  private groupSegmentsForSrt(
    segments: Array<{ start: string; end: string; speech: string }>,
    targetDurationSeconds: number,
  ): Array<{ start: string; end: string; speech: string }> {
    if (segments.length === 0) {
      return [];
    }

    const grouped: Array<{ start: string; end: string; speech: string }> = [];
    let current: { start: string; end: string; speech: string } | null = null;
    let currentStartSeconds = 0;

    for (const segment of segments) {
      const segmentStartSeconds = this.timestampToSeconds(segment.start);
      const segmentEndSeconds = this.timestampToSeconds(segment.end);

      if (!current) {
        current = { ...segment };
        currentStartSeconds = segmentStartSeconds;
      } else {
        current.speech = `${current.speech} ${segment.speech}`.trim();
        current.end = segment.end;
      }

      if (segmentEndSeconds - currentStartSeconds >= targetDurationSeconds) {
        grouped.push(current);
        current = null;
      }
    }

    if (current) {
      grouped.push(current);
    }

    return grouped;
  }

  private timestampToSeconds(timestamp: string): number {
    const sanitized = timestamp.replace(',', '.');
    const [hours, minutes, secondsPart] = sanitized.split(':');
    const hoursNum = Number(hours) || 0;
    const minutesNum = Number(minutes) || 0;
    const secondsNum = Number(secondsPart) || 0;

    return hoursNum * 3600 + minutesNum * 60 + secondsNum;
  }
}
