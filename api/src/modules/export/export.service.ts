import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Observable } from 'rxjs';
import axios from 'axios';
import { Export } from './entities/export.entity';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportResponseDto } from './dto/export-response.dto';

@Injectable()
export class ExportService {
  private readonly exportWorkerUrl: string;
  private exportProgressStreams = new Map<string, Subject<MessageEvent>>();

  constructor(
    @InjectRepository(Export)
    private readonly exportRepository: Repository<Export>,
    private readonly configService: ConfigService,
  ) {
    this.exportWorkerUrl = this.configService.get<string>('EXPORT_WORKER_URL', 'http://localhost:8004');
  }

  async generateExport(createExportDto: CreateExportDto): Promise<ExportResponseDto> {
    try {
      // Call export worker
      const response = await axios.post(`${this.exportWorkerUrl}/export/generate`, createExportDto);
      
      // Save to database
      const exportRecord = this.exportRepository.create({
        ...createExportDto,
        ...response.data,
      });
      
      const savedExport = await this.exportRepository.save(exportRecord);
      
      return this.mapToResponseDto(savedExport);
    } catch (error) {
      throw new Error(`Failed to generate export: ${error.message}`);
    }
  }

  async generateExportAsync(createExportDto: CreateExportDto): Promise<{ exportId: string }> {
    try {
      // Create export record first
      const exportRecord = this.exportRepository.create({
        ...createExportDto,
        status: 'pending',
      });
      
      const savedExport = await this.exportRepository.save(exportRecord);
      
      // Start background generation
      this.generateExportBackground(savedExport.id, createExportDto);
      
      return { exportId: savedExport.id };
    } catch (error) {
      throw new Error(`Failed to start export generation: ${error.message}`);
    }
  }

  async getExport(exportId: string): Promise<ExportResponseDto> {
    const exportRecord = await this.exportRepository.findOne({ where: { id: exportId } });
    
    if (!exportRecord) {
      throw new NotFoundException(`Export with ID ${exportId} not found`);
    }
    
    return this.mapToResponseDto(exportRecord);
  }

  async getExportsByDeck(deckId: string): Promise<ExportResponseDto[]> {
    const exports = await this.exportRepository.find({
      where: { deckId },
      order: { createdAt: 'DESC' },
    });
    
    return exports.map(export => this.mapToResponseDto(export));
  }

  async deleteExport(exportId: string): Promise<{ message: string }> {
    const exportRecord = await this.exportRepository.findOne({ where: { id: exportId } });
    
    if (!exportRecord) {
      throw new NotFoundException(`Export with ID ${exportId} not found`);
    }
    
    // Soft delete
    await this.exportRepository.update(exportId, { deletedAt: new Date() });
    
    return { message: 'Export deleted successfully' };
  }

  streamExportProgress(exportId: string): Observable<MessageEvent> {
    let stream = this.exportProgressStreams.get(exportId);
    
    if (!stream) {
      stream = new Subject<MessageEvent>();
      this.exportProgressStreams.set(exportId, stream);
    }
    
    return stream.asObservable();
  }

  private async generateExportBackground(exportId: string, createExportDto: CreateExportDto): Promise<void> {
    try {
      // Call export worker asynchronously
      const response = await axios.post(`${this.exportWorkerUrl}/export/generate/async`, {
        exportId,
        ...createExportDto,
      });
      
      // Update status
      await this.exportRepository.update(exportId, { status: 'processing' });
      
      // Stream progress updates
      const stream = this.exportProgressStreams.get(exportId);
      if (stream) {
        stream.next(new MessageEvent('message', { data: { status: 'processing', progress: 0 } }));
      }
      
      // Poll for completion
      this.pollExportCompletion(exportId);
      
    } catch (error) {
      await this.exportRepository.update(exportId, { status: 'failed' });
      
      const stream = this.exportProgressStreams.get(exportId);
      if (stream) {
        stream.next(new MessageEvent('message', { 
          data: { status: 'failed', error: error.message } 
        }));
        stream.complete();
        this.exportProgressStreams.delete(exportId);
      }
    }
  }

  private async pollExportCompletion(exportId: string): Promise<void> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await axios.get(`${this.exportWorkerUrl}/export/${exportId}`);
        const exportData = response.data;
        
        if (exportData.status === 'completed') {
          // Update database
          await this.exportRepository.update(exportId, {
            status: 'completed',
            filePath: exportData.filePath,
            fileSize: exportData.fileSize,
            downloadUrl: exportData.downloadUrl,
          });
          
          // Send completion event
          const stream = this.exportProgressStreams.get(exportId);
          if (stream) {
            stream.next(new MessageEvent('message', { 
              data: { status: 'completed', progress: 100, downloadUrl: exportData.downloadUrl } 
            }));
            stream.complete();
            this.exportProgressStreams.delete(exportId);
          }
          
        } else if (exportData.status === 'failed') {
          await this.exportRepository.update(exportId, { status: 'failed' });
          
          const stream = this.exportProgressStreams.get(exportId);
          if (stream) {
            stream.next(new MessageEvent('message', { 
              data: { status: 'failed', error: exportData.error } 
            }));
            stream.complete();
            this.exportProgressStreams.delete(exportId);
          }
          
        } else if (attempts < maxAttempts) {
          // Continue polling
          attempts++;
          const stream = this.exportProgressStreams.get(exportId);
          if (stream) {
            stream.next(new MessageEvent('message', { 
              data: { status: 'processing', progress: Math.min(90, attempts * 1.5) } 
            }));
          }
          setTimeout(poll, 5000);
        } else {
          // Timeout
          await this.exportRepository.update(exportId, { status: 'timeout' });
          
          const stream = this.exportProgressStreams.get(exportId);
          if (stream) {
            stream.next(new MessageEvent('message', { 
              data: { status: 'timeout', error: 'Export generation timed out' } 
            }));
            stream.complete();
            this.exportProgressStreams.delete(exportId);
          }
        }
        
      } catch (error) {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else {
          await this.exportRepository.update(exportId, { status: 'failed' });
          
          const stream = this.exportProgressStreams.get(exportId);
          if (stream) {
            stream.next(new MessageEvent('message', { 
              data: { status: 'failed', error: 'Export generation failed' } 
            }));
            stream.complete();
            this.exportProgressStreams.delete(exportId);
          }
        }
      }
    };
    
    setTimeout(poll, 5000);
  }

  private mapToResponseDto(exportRecord: Export): ExportResponseDto {
    return {
      id: exportRecord.id,
      deckId: exportRecord.deckId,
      exportType: exportRecord.exportType,
      format: exportRecord.format,
      filePath: exportRecord.filePath,
      fileSize: exportRecord.fileSize,
      downloadUrl: exportRecord.downloadUrl,
      includeAnalysis: exportRecord.includeAnalysis,
      includeQA: exportRecord.includeQA,
      qaSessionId: exportRecord.qaSessionId,
      createdAt: exportRecord.createdAt,
      updatedAt: exportRecord.updatedAt,
    };
  }
}
