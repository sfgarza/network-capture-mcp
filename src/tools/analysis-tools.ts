import { TrafficStorage, TrafficStats } from '../types/traffic.js';
import { SQLiteTrafficStorage } from '../storage/sqlite-storage.js';
import { SharedConfig } from '../config/shared-config.js';

export interface TrafficPattern {
  type: 'frequent_endpoint' | 'error_spike' | 'slow_response' | 'websocket_burst' | 'unusual_user_agent';
  description: string;
  severity: 'low' | 'medium' | 'high';
  count: number;
  examples: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
  metadata: Record<string, unknown>;
}

export interface TrafficReport {
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalRequests: number;
    totalWebSocketConnections: number;
    totalWebSocketMessages: number;
    uniqueHosts: number;
    errorRate: number;
    averageResponseTime: number;
  };
  topEndpoints: Array<{
    url: string;
    count: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
  statusCodeDistribution: Record<number, number>;
  methodDistribution: Record<string, number>;
  hostDistribution: Record<string, number>;
  patterns: TrafficPattern[];
  recommendations: string[];
}

export class AnalysisTools {
  private storage?: TrafficStorage;

  private async getStorage(): Promise<TrafficStorage> {
    if (!this.storage) {
      const sharedConfig = SharedConfig.getInstance();
      this.storage = new SQLiteTrafficStorage({
        dbPath: sharedConfig.defaultDbPath,
        enableFTS: true,
      });
    }
    return this.storage;
  }

  /**
   * Analyze traffic patterns and detect anomalies
   */
  async analyzeTrafficPatterns(timeRange?: { start: string; end: string }) {
    try {
      const storage = await this.getStorage();

      const range = timeRange ? {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      } : {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date(),
      };

      const patterns: TrafficPattern[] = [];

      // Analyze frequent endpoints
      await this.analyzeFrequentEndpoints(storage, range, patterns);

      // Analyze error spikes
      await this.analyzeErrorSpikes(storage, range, patterns);

      // Analyze slow responses
      await this.analyzeSlowResponses(storage, range, patterns);

      // Analyze WebSocket bursts
      await this.analyzeWebSocketBursts(storage, range, patterns);

      // Analyze unusual user agents
      await this.analyzeUnusualUserAgents(storage, range, patterns);

      return {
        success: true,
        message: `Found ${patterns.length} traffic patterns`,
        data: {
          timeRange: range,
          patterns: patterns.sort((a, b) => {
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
          }),
          summary: {
            totalPatterns: patterns.length,
            highSeverity: patterns.filter(p => p.severity === 'high').length,
            mediumSeverity: patterns.filter(p => p.severity === 'medium').length,
            lowSeverity: patterns.filter(p => p.severity === 'low').length,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to analyze traffic patterns: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Generate comprehensive traffic report
   */
  async generateTrafficReport(timeRange?: { start: string; end: string }) {
    try {
      const storage = await this.getStorage();

      const range = timeRange ? {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      } : {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date(),
      };

      // Get basic statistics
      const stats = await storage.getTrafficStats(range);

      // Get top endpoints
      const topEndpoints = await this.getTopEndpoints(storage, range);

      // Get patterns
      const patternsResult = await this.analyzeTrafficPatterns({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });

      const patterns = patternsResult.success ? patternsResult.data?.patterns || [] : [];

      // Generate recommendations
      const recommendations = this.generateRecommendations(stats, patterns);

      const report: TrafficReport = {
        generatedAt: new Date(),
        timeRange: range,
        summary: {
          totalRequests: stats.totalRequests,
          totalWebSocketConnections: stats.totalWebSocketConnections,
          totalWebSocketMessages: stats.totalWebSocketMessages,
          uniqueHosts: Object.keys(stats.httpStats.hostCounts).length,
          errorRate: stats.httpStats.errorRate,
          averageResponseTime: stats.httpStats.averageResponseTime,
        },
        topEndpoints,
        statusCodeDistribution: stats.httpStats.statusCounts,
        methodDistribution: stats.httpStats.methodCounts,
        hostDistribution: stats.httpStats.hostCounts,
        patterns,
        recommendations,
      };

      return {
        success: true,
        message: 'Traffic report generated successfully',
        data: report,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate traffic report: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  // Pattern analysis methods
  private async analyzeFrequentEndpoints(storage: TrafficStorage, range: { start: Date; end: Date }, patterns: TrafficPattern[]): Promise<void> {
    try {
      // Query HTTP traffic for the time range
      const httpTraffic = await storage.queryHttpTraffic({
        timeRange: { start: range.start.toISOString(), end: range.end.toISOString() },
      });

      if (httpTraffic.length === 0) {
        return;
      }

      // Count requests per endpoint
      const endpointCounts = new Map<string, { count: number; responseTimes: number[]; errors: number }>();

      for (const entry of httpTraffic) {
        const endpoint = `${entry.method} ${entry.path}`;
        const existing = endpointCounts.get(endpoint) || { count: 0, responseTimes: [], errors: 0 };

        existing.count++;
        if (entry.response?.responseTime) {
          existing.responseTimes.push(entry.response.responseTime);
        }
        if (entry.response?.statusCode && entry.response.statusCode >= 400) {
          existing.errors++;
        }

        endpointCounts.set(endpoint, existing);
      }

      // Find endpoints with unusually high request counts
      const totalRequests = httpTraffic.length;
      const averageRequestsPerEndpoint = totalRequests / endpointCounts.size;
      const threshold = Math.max(10, averageRequestsPerEndpoint * 3); // At least 10 requests or 3x average

      for (const [endpoint, stats] of endpointCounts.entries()) {
        if (stats.count >= threshold) {
          const averageResponseTime = stats.responseTimes.length > 0
            ? stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length
            : 0;
          const errorRate = (stats.errors / stats.count) * 100;

          let severity: 'low' | 'medium' | 'high' = 'low';
          if (stats.count > threshold * 2) severity = 'medium';
          if (stats.count > threshold * 5) severity = 'high';

          patterns.push({
            type: 'frequent_endpoint',
            description: `Endpoint ${endpoint} received ${stats.count} requests (${(stats.count / totalRequests * 100).toFixed(1)}% of total traffic)`,
            severity,
            count: stats.count,
            examples: [endpoint],
            timeRange: range,
            metadata: {
              endpoint,
              requestCount: stats.count,
              percentageOfTotal: (stats.count / totalRequests * 100),
              averageResponseTime,
              errorRate,
              threshold,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing frequent endpoints:', error);
    }
  }

  private async analyzeErrorSpikes(storage: TrafficStorage, range: { start: Date; end: Date }, patterns: TrafficPattern[]): Promise<void> {
    try {
      // Query HTTP traffic for the time range
      const httpTraffic = await storage.queryHttpTraffic({
        timeRange: { start: range.start.toISOString(), end: range.end.toISOString() },
      });

      if (httpTraffic.length === 0) {
        return;
      }

      // Group requests by time intervals (5-minute buckets)
      const intervalMs = 5 * 60 * 1000; // 5 minutes
      const timeIntervals = new Map<number, { total: number; errors: number; endpoints: Set<string> }>();

      for (const entry of httpTraffic) {
        const intervalStart = Math.floor(entry.timestamp.getTime() / intervalMs) * intervalMs;
        const existing = timeIntervals.get(intervalStart) || { total: 0, errors: 0, endpoints: new Set() };

        existing.total++;
        if (entry.response?.statusCode && entry.response.statusCode >= 400) {
          existing.errors++;
          existing.endpoints.add(`${entry.method} ${entry.path}`);
        }

        timeIntervals.set(intervalStart, existing);
      }

      // Calculate baseline error rate
      const errorRates = Array.from(timeIntervals.values()).map(interval =>
        interval.total > 0 ? (interval.errors / interval.total) * 100 : 0,
      );

      if (errorRates.length === 0) {
        return;
      }

      const averageErrorRate = errorRates.reduce((a, b) => a + b, 0) / errorRates.length;

      // Detect spikes (error rate significantly above average)
      const spikeThreshold = Math.max(10, averageErrorRate * 2); // At least 10% or 2x average

      for (const [intervalStart, stats] of timeIntervals.entries()) {
        const errorRate = stats.total > 0 ? (stats.errors / stats.total) * 100 : 0;

        if (errorRate >= spikeThreshold && stats.errors >= 3) { // At least 3 errors
          let severity: 'low' | 'medium' | 'high' = 'low';
          if (errorRate > spikeThreshold * 1.5) severity = 'medium';
          if (errorRate > spikeThreshold * 2 || errorRate > 50) severity = 'high';

          const intervalDate = new Date(intervalStart);
          const endDate = new Date(intervalStart + intervalMs);

          patterns.push({
            type: 'error_spike',
            description: `Error spike detected: ${errorRate.toFixed(1)}% error rate (${stats.errors}/${stats.total} requests) between ${intervalDate.toISOString()} and ${endDate.toISOString()}`,
            severity,
            count: stats.errors,
            examples: Array.from(stats.endpoints).slice(0, 3), // Show up to 3 affected endpoints
            timeRange: { start: intervalDate, end: endDate },
            metadata: {
              errorRate,
              totalRequests: stats.total,
              errorCount: stats.errors,
              averageErrorRate,
              threshold: spikeThreshold,
              affectedEndpoints: Array.from(stats.endpoints),
              intervalStart: intervalDate.toISOString(),
              intervalEnd: endDate.toISOString(),
            },
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing error spikes:', error);
    }
  }

  private async analyzeSlowResponses(storage: TrafficStorage, range: { start: Date; end: Date }, patterns: TrafficPattern[]): Promise<void> {
    try {
      // Query HTTP traffic for the time range
      const httpTraffic = await storage.queryHttpTraffic({
        timeRange: { start: range.start.toISOString(), end: range.end.toISOString() },
      });

      if (httpTraffic.length === 0) {
        return;
      }

      // Collect response times by endpoint
      const endpointResponseTimes = new Map<string, number[]>();
      const allResponseTimes: number[] = [];

      for (const entry of httpTraffic) {
        if (entry.response?.responseTime) {
          const endpoint = `${entry.method} ${entry.path}`;
          const times = endpointResponseTimes.get(endpoint) || [];
          times.push(entry.response.responseTime);
          endpointResponseTimes.set(endpoint, times);
          allResponseTimes.push(entry.response.responseTime);
        }
      }

      if (allResponseTimes.length === 0) {
        return;
      }

      // Calculate baseline statistics
      allResponseTimes.sort((a, b) => a - b);
      const median = allResponseTimes[Math.floor(allResponseTimes.length / 2)];
      const p95 = allResponseTimes[Math.floor(allResponseTimes.length * 0.95)];
      const average = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;

      // Define slow response thresholds
      const slowThreshold = Math.max(1000, p95 * 1.5); // At least 1 second or 1.5x P95
      const verySlow = Math.max(3000, p95 * 3); // At least 3 seconds or 3x P95

      // Analyze each endpoint
      for (const [endpoint, responseTimes] of endpointResponseTimes.entries()) {
        if (responseTimes.length < 3) continue; // Need at least 3 samples

        const endpointAverage = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const slowRequests = responseTimes.filter(time => time >= slowThreshold).length;
        const verySlowRequests = responseTimes.filter(time => time >= verySlow).length;

        if (slowRequests > 0 && (slowRequests / responseTimes.length) >= 0.1) { // At least 10% slow
          let severity: 'low' | 'medium' | 'high' = 'low';
          if (endpointAverage > verySlow || (slowRequests / responseTimes.length) > 0.3) severity = 'medium';
          if (endpointAverage > verySlow * 2 || (slowRequests / responseTimes.length) > 0.5) severity = 'high';

          const maxResponseTime = Math.max(...responseTimes);
          const minResponseTime = Math.min(...responseTimes);

          patterns.push({
            type: 'slow_response',
            description: `Slow responses detected for ${endpoint}: ${endpointAverage.toFixed(0)}ms average (${slowRequests}/${responseTimes.length} requests > ${slowThreshold}ms)`,
            severity,
            count: slowRequests,
            examples: [endpoint],
            timeRange: range,
            metadata: {
              endpoint,
              averageResponseTime: endpointAverage,
              maxResponseTime,
              minResponseTime,
              totalRequests: responseTimes.length,
              slowRequests,
              verySlowRequests,
              slowPercentage: (slowRequests / responseTimes.length) * 100,
              slowThreshold,
              verySlow,
              globalAverage: average,
              globalMedian: median,
              globalP95: p95,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing slow responses:', error);
    }
  }

  private async analyzeWebSocketBursts(storage: TrafficStorage, range: { start: Date; end: Date }, patterns: TrafficPattern[]): Promise<void> {
    try {
      // Query WebSocket traffic for the time range
      const wsTraffic = await storage.queryWebSocketTraffic({
        timeRange: { start: range.start.toISOString(), end: range.end.toISOString() },
      });

      if (wsTraffic.length === 0) {
        return;
      }

      // Analyze message rates for each connection
      const connectionStats = new Map<string, {
        url: string;
        messageCount: number;
        duration: number;
        messagesPerSecond: number;
        burstIntervals: number;
      }>();

      for (const connection of wsTraffic) {
        if (connection.messages.length === 0) continue;

        const messageCount = connection.messages.length;
        const firstMessage = Math.min(...connection.messages.map(m => m.timestamp.getTime()));
        const lastMessage = Math.max(...connection.messages.map(m => m.timestamp.getTime()));
        const duration = (lastMessage - firstMessage) / 1000; // seconds

        if (duration <= 0) continue;

        const messagesPerSecond = messageCount / duration;

        // Detect burst intervals (high message rate in short periods)
        const intervalMs = 10 * 1000; // 10-second intervals
        const messageIntervals = new Map<number, number>();

        for (const message of connection.messages) {
          const intervalStart = Math.floor(message.timestamp.getTime() / intervalMs) * intervalMs;
          messageIntervals.set(intervalStart, (messageIntervals.get(intervalStart) || 0) + 1);
        }

        // Count intervals with high message rates (>10 messages per 10 seconds)
        const burstThreshold = 10;
        const burstIntervals = Array.from(messageIntervals.values()).filter(count => count >= burstThreshold).length;

        connectionStats.set(connection.id, {
          url: connection.url,
          messageCount,
          duration,
          messagesPerSecond,
          burstIntervals,
        });
      }

      // Calculate baseline statistics
      const allRates = Array.from(connectionStats.values()).map(stats => stats.messagesPerSecond);
      if (allRates.length === 0) return;

      allRates.sort((a, b) => a - b);
      const medianRate = allRates[Math.floor(allRates.length / 2)];
      const averageRate = allRates.reduce((a, b) => a + b, 0) / allRates.length;
      const p95Rate = allRates[Math.floor(allRates.length * 0.95)];

      // Define burst thresholds
      const burstThreshold = Math.max(5, averageRate * 3); // At least 5 msg/sec or 3x average
      const severeBurstThreshold = Math.max(20, p95Rate * 2); // At least 20 msg/sec or 2x P95

      // Identify connections with burst patterns
      for (const [connectionId, stats] of connectionStats.entries()) {
        if (stats.messagesPerSecond >= burstThreshold || stats.burstIntervals > 0) {
          let severity: 'low' | 'medium' | 'high' = 'low';
          if (stats.messagesPerSecond >= severeBurstThreshold || stats.burstIntervals >= 3) severity = 'medium';
          if (stats.messagesPerSecond >= severeBurstThreshold * 2 || stats.burstIntervals >= 5) severity = 'high';

          patterns.push({
            type: 'websocket_burst',
            description: `WebSocket burst detected on ${stats.url}: ${stats.messagesPerSecond.toFixed(1)} messages/second (${stats.messageCount} messages over ${stats.duration.toFixed(1)}s)`,
            severity,
            count: stats.messageCount,
            examples: [stats.url],
            timeRange: range,
            metadata: {
              connectionId,
              url: stats.url,
              messageCount: stats.messageCount,
              duration: stats.duration,
              messagesPerSecond: stats.messagesPerSecond,
              burstIntervals: stats.burstIntervals,
              burstThreshold,
              severeBurstThreshold,
              averageRate,
              medianRate,
              p95Rate,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing WebSocket bursts:', error);
    }
  }

  private async analyzeUnusualUserAgents(storage: TrafficStorage, range: { start: Date; end: Date }, patterns: TrafficPattern[]): Promise<void> {
    try {
      // Query HTTP traffic for the time range
      const httpTraffic = await storage.queryHttpTraffic({
        timeRange: { start: range.start.toISOString(), end: range.end.toISOString() },
      });

      if (httpTraffic.length === 0) {
        return;
      }

      // Collect user agent statistics
      const userAgentStats = new Map<string, {
        count: number;
        hosts: Set<string>;
        paths: Set<string>;
        methods: Set<string>;
        firstSeen: Date;
        lastSeen: Date;
      }>();

      for (const entry of httpTraffic) {
        const userAgent = entry.userAgent || 'Unknown';
        const existing = userAgentStats.get(userAgent) || {
          count: 0,
          hosts: new Set(),
          paths: new Set(),
          methods: new Set(),
          firstSeen: entry.timestamp,
          lastSeen: entry.timestamp,
        };

        existing.count++;
        existing.hosts.add(entry.host);
        existing.paths.add(entry.path);
        existing.methods.add(entry.method);
        if (entry.timestamp < existing.firstSeen) existing.firstSeen = entry.timestamp;
        if (entry.timestamp > existing.lastSeen) existing.lastSeen = entry.timestamp;

        userAgentStats.set(userAgent, existing);
      }

      // Define suspicious patterns
      const suspiciousPatterns = [
        // Bot-like user agents
        /bot|crawler|spider|scraper|scanner/i,
        // Automated tools
        /curl|wget|python|java|go-http|postman|insomnia/i,
        // Security scanners
        /nmap|nikto|sqlmap|burp|zap|acunetix/i,
        // Empty or very short user agents
        /^.{0,10}$/,
        // Unusual patterns
        /^[a-zA-Z]{1,3}\/[0-9.]+$/,
      ];

      const commonBrowsers = /mozilla|chrome|safari|firefox|edge|opera/i;

      // Analyze each user agent
      for (const [userAgent, stats] of userAgentStats.entries()) {
        let suspiciousScore = 0;
        const suspiciousReasons: string[] = [];

        // Check for suspicious patterns
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(userAgent)) {
            suspiciousScore += 2;
            suspiciousReasons.push(`Matches suspicious pattern: ${pattern.source}`);
          }
        }

        // Check if it's not a common browser
        if (!commonBrowsers.test(userAgent)) {
          suspiciousScore += 1;
          suspiciousReasons.push('Not a common browser user agent');
        }

        // High request volume from single user agent
        const requestRate = stats.count / httpTraffic.length;
        if (requestRate > 0.1) { // More than 10% of all requests
          suspiciousScore += 2;
          suspiciousReasons.push(`High request volume: ${(requestRate * 100).toFixed(1)}% of total traffic`);
        }

        // Accessing many different hosts
        if (stats.hosts.size > 5) {
          suspiciousScore += 1;
          suspiciousReasons.push(`Accessing many hosts: ${stats.hosts.size}`);
        }

        // Very short or very long user agent strings
        if (userAgent.length < 10 || userAgent.length > 200) {
          suspiciousScore += 1;
          suspiciousReasons.push(`Unusual length: ${userAgent.length} characters`);
        }

        // Rapid requests (if duration is short but many requests)
        const duration = (stats.lastSeen.getTime() - stats.firstSeen.getTime()) / 1000;
        if (duration > 0 && stats.count / duration > 10) { // More than 10 requests per second
          suspiciousScore += 2;
          suspiciousReasons.push(`High request rate: ${(stats.count / duration).toFixed(1)} requests/second`);
        }

        // Determine if this is suspicious enough to report
        if (suspiciousScore >= 3) {
          let severity: 'low' | 'medium' | 'high' = 'low';
          if (suspiciousScore >= 5) severity = 'medium';
          if (suspiciousScore >= 7) severity = 'high';

          patterns.push({
            type: 'unusual_user_agent',
            description: `Suspicious user agent detected: "${userAgent}" (${stats.count} requests, score: ${suspiciousScore})`,
            severity,
            count: stats.count,
            examples: [userAgent],
            timeRange: range,
            metadata: {
              userAgent,
              requestCount: stats.count,
              suspiciousScore,
              suspiciousReasons,
              hostsAccessed: Array.from(stats.hosts),
              pathsAccessed: Array.from(stats.paths).slice(0, 10), // Limit to first 10
              methodsUsed: Array.from(stats.methods),
              firstSeen: stats.firstSeen.toISOString(),
              lastSeen: stats.lastSeen.toISOString(),
              duration,
              requestRate: stats.count / duration,
              percentageOfTraffic: (stats.count / httpTraffic.length) * 100,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing unusual user agents:', error);
    }
  }

  private async getTopEndpoints(storage: TrafficStorage, range: { start: Date; end: Date }) {
    try {
      // Query HTTP traffic for the time range
      const httpTraffic = await storage.queryHttpTraffic({
        timeRange: { start: range.start.toISOString(), end: range.end.toISOString() },
      });

      if (httpTraffic.length === 0) {
        return [];
      }

      // Collect endpoint statistics
      const endpointStats = new Map<string, {
        count: number;
        responseTimes: number[];
        errors: number;
        methods: Set<string>;
        statusCodes: Set<number>;
      }>();

      for (const entry of httpTraffic) {
        const endpoint = entry.path;
        const existing = endpointStats.get(endpoint) || {
          count: 0,
          responseTimes: [],
          errors: 0,
          methods: new Set(),
          statusCodes: new Set(),
        };

        existing.count++;
        existing.methods.add(entry.method);

        if (entry.response) {
          if (entry.response.responseTime) {
            existing.responseTimes.push(entry.response.responseTime);
          }
          existing.statusCodes.add(entry.response.statusCode);
          if (entry.response.statusCode >= 400) {
            existing.errors++;
          }
        }

        endpointStats.set(endpoint, existing);
      }

      // Convert to array and calculate statistics
      const topEndpoints = Array.from(endpointStats.entries())
        .map(([url, stats]) => {
          const averageResponseTime = stats.responseTimes.length > 0
            ? stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length
            : 0;
          const errorRate = stats.count > 0 ? (stats.errors / stats.count) * 100 : 0;

          return {
            url,
            count: stats.count,
            averageResponseTime: Math.round(averageResponseTime),
            errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimal places
            methods: Array.from(stats.methods),
            statusCodes: Array.from(stats.statusCodes).sort((a, b) => a - b),
          };
        })
        .sort((a, b) => b.count - a.count) // Sort by request count descending
        .slice(0, 10); // Top 10 endpoints

      return topEndpoints;
    } catch (error) {
      console.error('Error getting top endpoints:', error);
      return [];
    }
  }

  private generateRecommendations(stats: TrafficStats, patterns: TrafficPattern[]): string[] {
    const recommendations: string[] = [];

    if (stats.httpStats.errorRate > 10) {
      recommendations.push('High error rate detected. Consider investigating failing endpoints.');
    }

    if (stats.httpStats.averageResponseTime > 1000) {
      recommendations.push('Slow average response time. Consider optimizing slow endpoints.');
    }

    const highSeverityPatterns = patterns.filter(p => p.severity === 'high');
    if (highSeverityPatterns.length > 0) {
      recommendations.push(`${highSeverityPatterns.length} high-severity patterns detected. Immediate attention recommended.`);
    }

    return recommendations;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.storage) {
      await this.storage.close();
    }
  }
}
