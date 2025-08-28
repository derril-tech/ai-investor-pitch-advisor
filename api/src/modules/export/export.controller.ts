import { Controller, Post, Get, Delete, Param, Body, UseGuards, Sse } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExportService } from './export.service';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportResponseDto } from './dto/export-response.dto';
import { Observable } from 'rxjs';

@ApiTags('Export')
@Controller('export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate export synchronously' })
  @ApiResponse({ status: 201, description: 'Export generated successfully', type: ExportResponseDto })
  async generateExport(@Body() createExportDto: CreateExportDto): Promise<ExportResponseDto> {
    return this.exportService.generateExport(createExportDto);
  }

  @Post('generate/async')
  @ApiOperation({ summary: 'Generate export asynchronously' })
  @ApiResponse({ status: 202, description: 'Export generation started' })
  async generateExportAsync(@Body() createExportDto: CreateExportDto): Promise<{ exportId: string }> {
    return this.exportService.generateExportAsync(createExportDto);
  }

  @Get(':exportId')
  @ApiOperation({ summary: 'Get export details' })
  @ApiResponse({ status: 200, description: 'Export details retrieved', type: ExportResponseDto })
  async getExport(@Param('exportId') exportId: string): Promise<ExportResponseDto> {
    return this.exportService.getExport(exportId);
  }

  @Get('deck/:deckId')
  @ApiOperation({ summary: 'Get all exports for a deck' })
  @ApiResponse({ status: 200, description: 'Exports retrieved', type: [ExportResponseDto] })
  async getExportsByDeck(@Param('deckId') deckId: string): Promise<ExportResponseDto[]> {
    return this.exportService.getExportsByDeck(deckId);
  }

  @Delete(':exportId')
  @ApiOperation({ summary: 'Delete export' })
  @ApiResponse({ status: 200, description: 'Export deleted successfully' })
  async deleteExport(@Param('exportId') exportId: string): Promise<{ message: string }> {
    return this.exportService.deleteExport(exportId);
  }

  @Sse(':exportId/stream')
  @ApiOperation({ summary: 'Stream export generation progress' })
  streamExportProgress(@Param('exportId') exportId: string): Observable<MessageEvent> {
    return this.exportService.streamExportProgress(exportId);
  }
}
