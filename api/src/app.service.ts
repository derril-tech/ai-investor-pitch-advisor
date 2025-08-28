import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      name: 'AI Investor Pitch Advisor API',
      version: '1.0.0',
      description: 'AI-driven pitch deck analysis and investor Q&A preparation',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }
}
