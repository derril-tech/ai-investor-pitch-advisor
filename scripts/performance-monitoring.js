#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Runs automated performance tests against the AI Investor Pitch Advisor API
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_DURATION = 5 * 60 * 1000; // 5 minutes
const CONCURRENT_USERS = 10;

const performanceTargets = {
  http_request_duration_p95: 5000, // 5 seconds
  deck_upload_duration_p95: 30000, // 30 seconds
  analysis_duration_p95: 45000, // 45 seconds
  qa_generation_duration_p95: 30000, // 30 seconds
  export_generation_duration_p95: 60000, // 60 seconds
  error_rate: 0.05, // 5%
  availability: 0.999, // 99.9%
};

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      responseTimes: [],
      endpointMetrics: new Map(),
    };
  }

  async runPerformanceTest() {
    console.log('🚀 Starting Performance Test...');
    console.log(`📊 Target: ${CONCURRENT_USERS} concurrent users for ${TEST_DURATION / 1000}s`);
    console.log(`🔗 API Base URL: ${API_BASE_URL}`);

    const startTime = performance.now();
    const endTime = startTime + TEST_DURATION;

    // Start concurrent users
    const userPromises = [];
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      userPromises.push(this.simulateUser(i, endTime));
    }

    await Promise.allSettled(userPromises);

    const totalDuration = performance.now() - startTime;
    this.generateReport(totalDuration);
  }

  async simulateUser(userId, endTime) {
    while (performance.now() < endTime) {
      try {
        await this.performRandomOperation(userId);
        // Random delay between operations (0.1-2 seconds)
        await this.delay(Math.random() * 1900 + 100);
      } catch (error) {
        this.metrics.errorCount++;
        console.error(`❌ User ${userId} error:`, error.message);
        await this.delay(1000); // Wait 1s before retry
      }
    }
  }

  async performRandomOperation(userId) {
    const operations = [
      { name: 'health_check', weight: 30, fn: () => this.healthCheck() },
      { name: 'get_decks', weight: 20, fn: () => this.getDecks() },
      { name: 'upload_deck', weight: 10, fn: () => this.uploadDeck(userId) },
      { name: 'run_analysis', weight: 15, fn: () => this.runAnalysis(userId) },
      { name: 'generate_qa', weight: 10, fn: () => this.generateQA(userId) },
      { name: 'get_suggestions', weight: 10, fn: () => this.getSuggestions(userId) },
      { name: 'export_data', weight: 5, fn: () => this.exportData(userId) },
    ];

    const operation = this.selectWeightedOperation(operations);
    const startTime = performance.now();

    try {
      await operation.fn();
      const duration = performance.now() - startTime;

      this.recordMetric(operation.name, duration, true);
      this.metrics.requestCount++;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(operation.name, duration, false);
      throw error;
    }
  }

  selectWeightedOperation(operations) {
    const totalWeight = operations.reduce((sum, op) => sum + op.weight, 0);
    let random = Math.random() * totalWeight;

    for (const operation of operations) {
      random -= operation.weight;
      if (random <= 0) {
        return operation;
      }
    }

    return operations[0];
  }

  async healthCheck() {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  }

  async getDecks() {
    const response = await axios.get(`${API_BASE_URL}/deck`, {
      headers: { Authorization: `Bearer test-token` }
    });
    return response.data;
  }

  async uploadDeck(userId) {
    // Simulate file upload
    const formData = new FormData();
    formData.append('file', new Blob(['test content']), `test-deck-${userId}.pptx`);

    const response = await axios.post(`${API_BASE_URL}/deck/upload`, formData, {
      headers: {
        Authorization: `Bearer test-token`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async runAnalysis(userId) {
    const response = await axios.post(`${API_BASE_URL}/analysis/run`, {
      deckId: `test-deck-${userId}`
    }, {
      headers: { Authorization: `Bearer test-token` }
    });
    return response.data;
  }

  async generateQA(userId) {
    const response = await axios.post(`${API_BASE_URL}/qa/sessions`, {
      deckId: `test-deck-${userId}`,
      name: 'Performance Test Q&A',
      sector: 'Technology',
      stage: 'Series A'
    }, {
      headers: { Authorization: `Bearer test-token` }
    });
    return response.data;
  }

  async getSuggestions(userId) {
    const response = await axios.get(`${API_BASE_URL}/suggestion/deck/test-deck-${userId}`, {
      headers: { Authorization: `Bearer test-token` }
    });
    return response.data;
  }

  async exportData(userId) {
    const response = await axios.post(`${API_BASE_URL}/export/generate`, {
      deckId: `test-deck-${userId}`,
      format: 'pdf',
      type: 'analysis_report'
    }, {
      headers: { Authorization: `Bearer test-token` }
    });
    return response.data;
  }

  recordMetric(endpoint, duration, success) {
    if (!this.metrics.endpointMetrics.has(endpoint)) {
      this.metrics.endpointMetrics.set(endpoint, {
        count: 0,
        errors: 0,
        responseTimes: [],
        totalDuration: 0
      });
    }

    const endpointMetrics = this.metrics.endpointMetrics.get(endpoint);
    endpointMetrics.count++;
    endpointMetrics.totalDuration += duration;
    endpointMetrics.responseTimes.push(duration);

    if (!success) {
      endpointMetrics.errors++;
    }
  }

  generateReport(totalDuration) {
    console.log('\n📊 PERFORMANCE TEST RESULTS');
    console.log('=' .repeat(50));
    console.log(`⏱️  Total Test Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`👥 Concurrent Users: ${CONCURRENT_USERS}`);
    console.log(`📈 Total Requests: ${this.metrics.requestCount}`);
    console.log(`❌ Total Errors: ${this.metrics.errorCount}`);
    console.log(`📊 Requests/Second: ${(this.metrics.requestCount / (totalDuration / 1000)).toFixed(2)}`);
    console.log(`⚠️  Error Rate: ${((this.metrics.errorCount / this.metrics.requestCount) * 100).toFixed(2)}%`);

    console.log('\n📋 ENDPOINT PERFORMANCE:');
    console.log('-'.repeat(70));

    for (const [endpoint, metrics] of this.metrics.endpointMetrics.entries()) {
      const avgResponseTime = metrics.totalDuration / metrics.count;
      const errorRate = (metrics.errors / metrics.count) * 100;
      const p95ResponseTime = this.calculatePercentile(metrics.responseTimes, 95);

      console.log(`${endpoint.padEnd(20)} | ${metrics.count.toString().padStart(4)} | ${avgResponseTime.toFixed(0).padStart(6)}ms | ${errorRate.toFixed(1).padStart(5)}% | ${p95ResponseTime.toFixed(0).padStart(6)}ms`);

      // Check against performance targets
      this.checkPerformanceTarget(endpoint, p95ResponseTime, errorRate);
    }

    console.log('\n🎯 PERFORMANCE TARGETS CHECK:');
    this.checkOverallPerformance();
  }

  checkPerformanceTarget(endpoint, p95Time, errorRate) {
    const targets = {
      'health_check': { p95: 1000, errorRate: 0.01 },
      'get_decks': { p95: 2000, errorRate: 0.05 },
      'upload_deck': { p95: performanceTargets.deck_upload_duration_p95, errorRate: 0.05 },
      'run_analysis': { p95: performanceTargets.analysis_duration_p95, errorRate: 0.05 },
      'generate_qa': { p95: performanceTargets.qa_generation_duration_p95, errorRate: 0.05 },
      'get_suggestions': { p95: 2000, errorRate: 0.05 },
      'export_data': { p95: performanceTargets.export_generation_duration_p95, errorRate: 0.05 },
    };

    const target = targets[endpoint];
    if (!target) return;

    const p95Ok = p95Time <= target.p95;
    const errorOk = errorRate <= target.errorRate;

    const status = p95Ok && errorOk ? '✅' : '❌';
    console.log(`  ${status} ${endpoint}: P95=${p95Ok ? 'PASS' : 'FAIL'} (${p95Time.toFixed(0)}ms), Error=${errorOk ? 'PASS' : 'FAIL'} (${errorRate.toFixed(1)}%)`);
  }

  checkOverallPerformance() {
    const overallErrorRate = (this.metrics.errorCount / this.metrics.requestCount) * 100;

    console.log(`\n📈 OVERALL PERFORMANCE:`);
    console.log(`  Error Rate: ${overallErrorRate.toFixed(2)}% (Target: ${(performanceTargets.error_rate * 100).toFixed(1)}%)`);
    console.log(`  Availability: ${((1 - overallErrorRate / 100) * 100).toFixed(3)}% (Target: ${(performanceTargets.availability * 100).toFixed(1)}%)`);

    const overallStatus = overallErrorRate <= (performanceTargets.error_rate * 100) ? '✅ PASS' : '❌ FAIL';
    console.log(`  Status: ${overallStatus}`);
  }

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;

    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run performance test if called directly
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.runPerformanceTest()
    .then(() => {
      console.log('\n✅ Performance test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Performance test failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceMonitor;
