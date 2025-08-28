import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddAnswerDto {
  @ApiProperty({ description: 'Answer text' })
  @IsString()
  @IsNotEmpty()
  answer: string;
}
