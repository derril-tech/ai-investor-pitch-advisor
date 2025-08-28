import { IsString, IsEnum, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExportDto {
  @ApiProperty({ description: 'Deck ID to export' })
  @IsString()
  @IsUUID()
  deckId: string;

  @ApiProperty({ 
    description: 'Export format',
    enum: ['pdf', 'pptx', 'docx'],
    example: 'pdf'
  })
  @IsEnum(['pdf', 'pptx', 'docx'])
  format: 'pdf' | 'pptx' | 'docx';

  @ApiProperty({ 
    description: 'Export type',
    enum: ['analysis_report', 'qa_summary', 'comprehensive_report'],
    example: 'analysis_report'
  })
  @IsEnum(['analysis_report', 'qa_summary', 'comprehensive_report'])
  type: 'analysis_report' | 'qa_summary' | 'comprehensive_report';

  @ApiProperty({ 
    description: 'Include analysis data',
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  includeAnalysis?: boolean = true;

  @ApiProperty({ 
    description: 'Include Q&A data',
    default: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  includeQA?: boolean = false;

  @ApiProperty({ 
    description: 'Q&A session ID to include',
    required: false
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  qaSessionId?: string;
}
