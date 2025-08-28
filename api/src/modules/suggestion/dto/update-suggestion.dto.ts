import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSuggestionDto {
  @ApiProperty({
    description: 'New status for the suggestion',
    enum: ['applied', 'accepted', 'rejected', 'dismissed']
  })
  @IsEnum(['applied', 'accepted', 'rejected', 'dismissed'])
  status: 'applied' | 'accepted' | 'rejected' | 'dismissed';

  @ApiProperty({
    description: 'Optional feedback or notes',
    required: false
  })
  @IsOptional()
  feedback?: string;
}
