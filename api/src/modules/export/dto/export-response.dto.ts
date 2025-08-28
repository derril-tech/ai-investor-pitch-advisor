import { ApiProperty } from '@nestjs/swagger';

export class ExportResponseDto {
  @ApiProperty({ description: 'Export ID' })
  id: string;

  @ApiProperty({ description: 'Deck ID' })
  deckId: string;

  @ApiProperty({ description: 'Export type' })
  exportType: string;

  @ApiProperty({ description: 'Export format' })
  format: string;

  @ApiProperty({ description: 'File path in storage' })
  filePath: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'Download URL (signed)' })
  downloadUrl: string;

  @ApiProperty({ description: 'Include analysis flag' })
  includeAnalysis: boolean;

  @ApiProperty({ description: 'Include Q&A flag' })
  includeQA: boolean;

  @ApiProperty({ description: 'Q&A session ID', required: false })
  qaSessionId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
