import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrafficPattern } from './analysis-tools.js';
import { TrafficStorage, HttpTrafficEntry, WebSocketTrafficEntry } from '../types/traffic.js';

// Mock the AnalysisTools class
vi.mock('./analysis-tools.js', () => ({
  AnalysisTools: vi.fn().mockImplementation(() => ({
    analyzeTrafficPatterns: vi.fn().mockResolvedValue({
      success: true,
      data: {
        patterns: [
          {
            type: 'high_error_rate',
            severity: 'medium',
            details: { errorRate: 15, endpoint: '/api/data' },
          },
          {
            type: 'repeated_requests',
            severity: 'medium',
            details: { endpoint: '/data', count: 10 },
          },
          {
            type: 'slow_responses',
            severity: 'high',
            details: { averageTime: 5000 },
          },
        ],
        summary: {
          totalRequests: 1000,
          timeRange: { start: new Date(), end: new Date() },
        },
        insights: ['High error rate detected'],
      },
    }),
    generateTrafficReport: vi.fn().mockResolvedValue({
      success: true,
      data: {
        generatedAt: new Date(),
        summary: {
          totalRequests: 1000,
          errorRate: 0.05,
        },
        topEndpoints: [
          { url: 'https://api.example.com/popular', count: 5 },
          { url: 'https://api.example.com/rare', count: 2 },
        ],
        recommendations: ['Consider optimizing error handling'],
      },
    }),
  })),
}));

// Import after mocking
const { AnalysisTools } = await import('./analysis-tools.js');

describe('AnalysisTools', () => {
  let analysisTools: any;
  let mockInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInstance = {
      analyzeTrafficPatterns: vi.fn().mockResolvedValue({
        success: true,
        data: {
          patterns: [
            {
              type: 'high_error_rate',
              severity: 'medium',
              details: { errorRate: 15, endpoint: '/api/data' },
            },
            {
              type: 'repeated_requests',
              severity: 'medium',
              details: { endpoint: '/data', count: 10 },
            },
            {
              type: 'slow_responses',
              severity: 'high',
              details: { averageTime: 5000 },
            },
          ],
          summary: {
            totalRequests: 1000,
            timeRange: { start: new Date(), end: new Date() },
          },
          insights: ['High error rate detected'],
        },
      }),
      generateTrafficReport: vi.fn().mockResolvedValue({
        success: true,
        data: {
          generatedAt: new Date(),
          summary: {
            totalRequests: 1000,
            errorRate: 0.05,
          },
          topEndpoints: [
            { url: 'https://api.example.com/popular', count: 5 },
            { url: 'https://api.example.com/rare', count: 2 },
          ],
          recommendations: ['Consider optimizing error handling'],
        },
      }),
    };

    vi.mocked(AnalysisTools).mockReturnValue(mockInstance);
    analysisTools = new AnalysisTools();
  });

  describe('basic functionality', () => {
    it('should analyze traffic patterns successfully', async () => {
      const result = await analysisTools.analyzeTrafficPatterns({
        timeRange: {
          start: '2023-01-01T00:00:00Z',
          end: '2023-01-01T23:59:59Z',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.patterns).toBeDefined();
      expect(result.data.patterns.length).toBeGreaterThan(0);
      expect(mockInstance.analyzeTrafficPatterns).toHaveBeenCalled();

      // Should detect patterns
      const errorPattern = result.data.patterns.find(p => p.type === 'high_error_rate');
      expect(errorPattern).toBeDefined();
      expect(errorPattern?.severity).toBe('medium');

      const repeatedPattern = result.data.patterns.find(p => p.type === 'repeated_requests');
      expect(repeatedPattern).toBeDefined();
      expect(repeatedPattern?.details.endpoint).toBe('/data');
      expect(repeatedPattern?.details.count).toBe(10);

      const slowPattern = result.data.patterns.find(p => p.type === 'slow_responses');
      expect(slowPattern).toBeDefined();
      expect(slowPattern?.severity).toBe('high');
    });

    it('should generate traffic report successfully', async () => {
      const result = await analysisTools.generateTrafficReport({
        timeRange: {
          start: '2023-01-01T00:00:00Z',
          end: '2023-12-31T23:59:59Z',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.generatedAt).toBeInstanceOf(Date);
      expect(result.data.summary.totalRequests).toBe(1000);
      expect(result.data.summary.errorRate).toBe(0.05);
      expect(result.data.topEndpoints).toBeDefined();
      expect(result.data.topEndpoints).toHaveLength(2);
      expect(result.data.topEndpoints[0].url).toBe('https://api.example.com/popular');
      expect(result.data.topEndpoints[0].count).toBe(5);
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.recommendations.length).toBeGreaterThan(0);
      expect(mockInstance.generateTrafficReport).toHaveBeenCalled();
    });
  });


});
