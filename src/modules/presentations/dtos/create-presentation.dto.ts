import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';

class SlideContentDto {
  @ApiProperty({
    description: 'Title of the slide',
    example: 'Introduction',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Content/text of the slide',
    example: 'Welcome to our presentation',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'Bullet points for the slide',
    type: [String],
    required: false,
    example: ['Point 1', 'Point 2', 'Point 3'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bullets?: string[];
}

export class CreatePresentationDto {
  @ApiProperty({
    description: 'Title of the presentation',
    example: 'My Presentation',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Slides content',
    type: [SlideContentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlideContentDto)
  slides: SlideContentDto[];
}
