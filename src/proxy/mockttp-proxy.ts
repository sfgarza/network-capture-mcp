import * as mockttp from 'mockttp';
import { TrafficStorage, ProxyConfig, ProxyStatus, HttpTrafficEntry, WebSocketTrafficEntry } from '../types/traffic.js';
import { MockttpRequest, MockttpResponse, MockttpWebSocketMessage, MockttpWebSocketCloseEvent, MockttpHTTPSConfig } from '../types/external.js';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { gunzipSync, inflateSync, brotliDecompressSync } from 'zlib';
import { decompress as zstdDecompress } from '@mongodb-js/zstd';
import { lookup } from 'dns';
import { promisify } from 'util';

export class MockttpProxyServer {
  private server?: mockttp.Mockttp;
  private storage: TrafficStorage;
  private config: ProxyConfig;
  private startTime?: Date;
  private generatedCA?: { cert: string; key: string };
  private stats = {
    totalRequests: 0,
    totalWebSocketConnections: 0,
    activeConnections: 0,
  };

  // Track requests for response correlation
  private requestTracker = new Map<string, { id: string; timestamp: number }>();

  // DNS lookup cache to avoid repeated lookups for the same host
  private dnsCache = new Map<string, { ip: string; timestamp: number }>();
  private readonly DNS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Promisified DNS lookup
  private dnsLookup = promisify(lookup);

  /**
   * Convert empty strings to null for cleaner database storage
   */
  private emptyStringToNull(value: string | undefined | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    return typeof value === 'string' && value.trim().length === 0 ? null : value;
  }

  constructor(storage: TrafficStorage, config: ProxyConfig) {
    this.storage = storage;
    this.config = config;
  }

  async start(): Promise<void> {
    console.log('🚀 MockttpProxyServer.start() called');
    if (this.server) {
      throw new Error('Proxy server is already running');
    }

    // Configure HTTPS if enabled
    let httpsConfig: MockttpHTTPSConfig | undefined = undefined;
    if (this.config.proxy.enableHTTPS) {
      httpsConfig = await this.setupHTTPS();
    }

    // Create mockttp server
    const serverOptions: Record<string, unknown> = {};
    if (httpsConfig) {
      serverOptions.https = httpsConfig;
    }
    this.server = mockttp.getLocal(serverOptions as Parameters<typeof mockttp.getLocal>[0]);

    // Set up basic passthrough rule BEFORE starting the server
    await this.server.forAnyRequest().thenPassThrough({
      ignoreHostHttpsErrors: this.config.proxy.ignoreHostHttpsErrors,
    });

    // Set up WebSocket rules if enabled
    if (this.config.proxy.enableWebSockets) {
      await this.server.forAnyWebSocket().thenPassThrough({
        ignoreHostHttpsErrors: this.config.proxy.ignoreHostHttpsErrors,
      });
    }

    // Start the server
    await this.server.start(this.config.proxy.httpPort);

    // Set up traffic capture AFTER server is started
    await this.setupTrafficCapture();

    this.startTime = new Date();
    console.error(`Proxy server started on port ${this.config.proxy.httpPort}${this.config.proxy.httpsPort ? ` and ${this.config.proxy.httpsPort}` : ''}`);
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.stop();
      this.server = undefined;
      this.startTime = undefined;

      // Clean up request tracker to prevent memory leaks
      this.requestTracker.clear();

      console.error('Proxy server stopped');
    }
  }

  private async setupHTTPS(): Promise<MockttpHTTPSConfig> {
    // If certificate paths are provided, use them
    if (this.config.proxy.certPath && this.config.proxy.keyPath) {
      if (existsSync(this.config.proxy.certPath) && existsSync(this.config.proxy.keyPath)) {
        console.error('Using provided SSL certificates');
        return {
          keyPath: this.config.proxy.keyPath,
          certPath: this.config.proxy.certPath,
          // Fix from issue #46: Use 2048-bit keys instead of default 1024-bit
          keyLength: 2048,
        };
      } else {
        console.warn('Provided certificate paths do not exist, generating CA certificate');
      }
    }

    // Generate CA certificate for HTTPS interception
    console.error('Generating CA certificate for HTTPS interception...');
    const ca = await mockttp.generateCACertificate({
      // Fix from issue #46: Use 2048-bit keys instead of default 1024-bit
      bits: 2048,
    });

    // Store the generated CA for potential export/trust installation
    this.generatedCA = ca;

    // Optionally save the CA certificate to disk for browser trust installation
    if (this.config.proxy.certPath) {
      try {
        const certDir = dirname(this.config.proxy.certPath);
        if (!existsSync(certDir)) {
          mkdirSync(certDir, { recursive: true });
        }

        writeFileSync(this.config.proxy.certPath, ca.cert);
        if (this.config.proxy.keyPath) {
          writeFileSync(this.config.proxy.keyPath, ca.key);
        }

        console.error(`CA certificate saved to: ${this.config.proxy.certPath}`);
        console.error('To trust this certificate in your browser:');
        console.error('1. Open browser settings');
        console.error('2. Navigate to Security/Privacy settings');
        console.error('3. Import the certificate as a trusted CA');
        console.error(`4. Import file: ${this.config.proxy.certPath}`);
      } catch (error) {
        console.warn('Failed to save CA certificate to disk:', error);
      }
    }

    return ca;
  }

  private async setupTrafficCapture(): Promise<void> {
    if (!this.server) {
      return;
    }

    try {
      // Set up traffic capture using event listeners
      this.server.on('request', async (req: unknown) => {
        try {
          await this.captureHttpRequest(req);
        } catch (error) {
          console.error('Failed to capture request:', error);
        }
      });

      this.server.on('response', async (res: unknown) => {
        try {
          await this.captureHttpResponse(res);
        } catch (error) {
          console.error('Failed to capture response:', error);
        }
      });

      // Set up WebSocket event listeners for message capture if enabled
      if (this.config.proxy.enableWebSockets) {
        this.setupWebSocketEventListeners();
      }

    } catch (error) {
      console.error('Failed to set up traffic capture:', error);
      throw error;
    }
  }

  private setupWebSocketEventListeners(): void {
    if (!this.server) return;

    // Listen for WebSocket upgrade events (connection establishment)
    this.server.on('websocket-request', async (req: unknown) => {
      await this.captureWebSocketUpgrade(req as MockttpRequest);
    });

    // Listen for inbound WebSocket messages (received by proxy)
    this.server.on('websocket-message-received', async (message: unknown) => {
      await this.captureWebSocketMessage(message as MockttpWebSocketMessage, 'inbound');
    });

    // Listen for outbound WebSocket messages (sent by proxy)
    this.server.on('websocket-message-sent', async (message: unknown) => {
      await this.captureWebSocketMessage(message as MockttpWebSocketMessage, 'outbound');
    });

    // Listen for WebSocket close events
    this.server.on('websocket-close', async (closeEvent: unknown) => {
      await this.captureWebSocketClose(closeEvent as MockttpWebSocketCloseEvent);
    });
  }

  /**
   * Resolve the IP address of a hostname with caching
   */
  private async resolveHostIP(hostname: string): Promise<string> {
    try {
      // Check if hostname is already an IP address
      if (this.isIPAddress(hostname)) {
        return hostname;
      }

      // Check cache first
      const cached = this.dnsCache.get(hostname);
      if (cached && (Date.now() - cached.timestamp) < this.DNS_CACHE_TTL) {
        return cached.ip;
      }

      // Perform DNS lookup
      const result = await this.dnsLookup(hostname);
      const ip = result.address;

      // Cache the result
      this.dnsCache.set(hostname, { ip, timestamp: Date.now() });

      return ip;
    } catch (error) {
      // Throw the error so it can be caught and logged in the calling function
      throw new Error(`DNS resolution failed for ${hostname}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a string is an IP address (IPv4 or IPv6)
   */
  private isIPAddress(str: string): boolean {
    // IPv4 regex
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6 regex (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

    return ipv4Regex.test(str) || ipv6Regex.test(str);
  }

  /**
   * Extract hostname from Host header, removing port if present
   */
  private extractHostnameFromHostHeader(hostHeader: string | undefined | null): string | null {
    if (!hostHeader) {
      return null;
    }

    // Handle IPv6 addresses in brackets [::1]:3000
    if (hostHeader.startsWith('[')) {
      const closeBracket = hostHeader.indexOf(']');
      if (closeBracket !== -1) {
        return hostHeader.substring(1, closeBracket);
      }
      return hostHeader; // Malformed, return as-is
    }

    // Handle IPv4 and hostnames: localhost:3000, 127.0.0.1:3000
    const colonIndex = hostHeader.lastIndexOf(':');
    if (colonIndex !== -1) {
      // Check if what follows the colon looks like a port number
      const potentialPort = hostHeader.substring(colonIndex + 1);
      if (/^\d+$/.test(potentialPort)) {
        return hostHeader.substring(0, colonIndex);
      }
    }

    // No port found, return the whole string
    return hostHeader;
  }

  private async captureHttpRequest(req: unknown): Promise<void> {
    // Type assertion for mockttp request object
    const request = req as MockttpRequest;
    let requestId: string | undefined;
    let errorMessage: string | undefined;

    // Helper function to get first value from header (string or string[])
    const getHeaderValue = (header: string | string[] | undefined): string | null => {
      if (!header) return null;
      return Array.isArray(header) ? header[0] : header;
    };

    try {
      this.stats.totalRequests++;
      this.stats.activeConnections++;

      // Parse URL safely
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(request.url);
      } catch (urlError) {
        // If URL parsing fails, create a basic URL and note the error
        const hostHeader = Array.isArray(request.headers.host) ? request.headers.host[0] : request.headers.host;
        parsedUrl = new URL(`http://${hostHeader || 'localhost'}${request.url}`);
        errorMessage = `URL parsing failed: ${urlError instanceof Error ? urlError.message : String(urlError)}`;
      }

      requestId = uuidv4();
      const timestamp = Date.now();

      // Capture request body separately to avoid async issues in object literal
      let requestBody: string | undefined;
      try {
        requestBody = this.config.capture.captureBody ? await this.getRequestBody(request) : undefined;
      } catch (bodyError) {
        errorMessage = errorMessage ?
          `${errorMessage}; Request body capture failed: ${bodyError instanceof Error ? bodyError.message : String(bodyError)}` :
          `Request body capture failed: ${bodyError instanceof Error ? bodyError.message : String(bodyError)}`;
      }

      // Resolve the remote host IP address
      const hostHeader = Array.isArray(request.headers.host) ? request.headers.host[0] : request.headers.host;
      // Extract hostname from host header (remove port if present)
      const hostname = this.extractHostnameFromHostHeader(hostHeader) || parsedUrl.hostname || 'unknown';
      let remoteHostIP: string;
      try {
        remoteHostIP = hostname !== 'unknown' ? await this.resolveHostIP(hostname) : 'unknown';
      } catch (dnsError) {
        remoteHostIP = 'unknown';
        errorMessage = errorMessage ?
          `${errorMessage}; DNS resolution failed: ${dnsError instanceof Error ? dnsError.message : String(dnsError)}` :
          `DNS resolution failed: ${dnsError instanceof Error ? dnsError.message : String(dnsError)}`;
      }

      const entry: HttpTrafficEntry = {
        id: requestId,
        timestamp: new Date(timestamp),
        method: request.method || 'GET',
        url: request.url,
        host: hostname,
        path: parsedUrl.pathname || request.url,
        queryString: this.emptyStringToNull(parsedUrl.search || ''),
        protocol: request.url.startsWith('https') ? 'https' : 'http',
        headers: this.config.capture.captureHeaders ? { ...request.headers } : {},
        rawHeaders: this.config.capture.captureHeaders ? Object.entries(request.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]) : [],
        body: requestBody,
        requestSize: this.calculateRequestSize(request),
        contentType: this.emptyStringToNull(getHeaderValue(request.headers['content-type'])),
        userAgent: this.emptyStringToNull(getHeaderValue(request.headers['user-agent'])),
        metadata: {
          clientIP: request.remoteIpAddress || request.remoteAddress || request.connection?.remoteAddress || 'unknown',
          destination: this.emptyStringToNull(remoteHostIP),
          errorMessage: this.emptyStringToNull(errorMessage),
        },
      };

      // Store the request (response will be added later)
      await this.storage.storeHttpTraffic(entry);

      // Track request for response correlation using mockttp's request ID
      const mockttpRequestId = request.id || `${request.method}-${request.url}-${timestamp}`;
      this.requestTracker.set(mockttpRequestId, { id: requestId, timestamp });

      // Also store on request object as backup (using type assertion for dynamic properties)
      (request as MockttpRequest & { _proxyRequestId?: string; _proxyTimestamp?: number })._proxyRequestId = requestId;
      (request as MockttpRequest & { _proxyRequestId?: string; _proxyTimestamp?: number })._proxyTimestamp = timestamp;

    } catch (error) {
      console.error('Failed to capture HTTP request:', error);

      // If we have a request ID, try to store the error in the database
      if (requestId) {
        try {
          const errorEntry: HttpTrafficEntry = {
            id: requestId,
            timestamp: new Date(),
            method: request?.method || 'UNKNOWN',
            url: request?.url || 'unknown',
            host: getHeaderValue(request?.headers?.host) || 'unknown',
            path: 'unknown',
            queryString: '',
            protocol: 'unknown' as 'http' | 'https',
            headers: {},
            rawHeaders: [],
            requestSize: 0,
            metadata: {
              clientIP: request?.remoteIpAddress || 'unknown',
              destination: 'unknown',
              errorMessage: `Request capture failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          };
          await this.storage.storeHttpTraffic(errorEntry);
        } catch (storageError) {
          console.error('Failed to store error entry:', storageError);
        }
      }
    }
  }

  private async captureHttpResponse(res: unknown): Promise<void> {
    // Type assertion for mockttp response object
    const response = res as MockttpResponse;

    try {
      this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);

      // Try multiple methods to get request ID for correlation
      let requestId: string | undefined;
      let requestTimestamp: number | undefined;

      // Method 1: Try to get from request tracker using mockttp request ID
      // Try both response.request.id and response.id (response object has its own id that matches request)
      const mockttpRequestId = response.request?.id || response.id;

      if (mockttpRequestId && this.requestTracker.has(mockttpRequestId)) {
        const tracked = this.requestTracker.get(mockttpRequestId)!;
        requestId = tracked.id;
        requestTimestamp = tracked.timestamp;
        // Clean up tracker to prevent memory leaks
        this.requestTracker.delete(mockttpRequestId);
      }

      // Method 2: Fallback to request object properties
      if (!requestId) {
        requestId = response.request?._proxyRequestId;
        requestTimestamp = response.request?._proxyTimestamp;
      }

      if (!requestId) {
        console.warn('No request ID found for response correlation');
        return;
      }

      // Calculate response time
      const responseTime = requestTimestamp ? Date.now() - requestTimestamp : 0;

      // Create response data with correct field names for updateHttpTrafficResponse
      const responseBody = this.config.capture.captureBody ? await this.getResponseBody(response) : undefined;

      const responseData = {
        statusCode: response.statusCode || 0,
        statusMessage: response.statusMessage || '',
        responseHeaders: this.config.capture.captureHeaders ? { ...response.headers } : {},
        responseRawHeaders: this.config.capture.captureHeaders ? Object.entries(response.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]) : [],
        responseBody,
        responseSize: await this.calculateResponseSize(response),
        responseTime,
      };

      // Update the stored HTTP traffic entry with response data
      await this.storage.updateHttpTrafficResponse(requestId, responseData);

    } catch (error) {
      console.error('❌ Failed to capture HTTP response:', error);
    }
  }

  private async captureWebSocketUpgrade(req: MockttpRequest): Promise<void> {
    try {
      this.stats.totalWebSocketConnections++;
      this.stats.activeConnections++;

      // Parse URL safely
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(req.url);
      } catch {
        parsedUrl = new URL(`ws://${req.headers.host || 'localhost'}${req.url}`);
      }

      // Use the request ID from mockttp as our connection ID for consistency
      const connectionId = req.id || uuidv4();

      // Helper function to get first value from header (string or string[])
      const getHeaderValue = (header: string | string[] | undefined): string | null => {
        if (!header) return null;
        return Array.isArray(header) ? header[0] : header;
      };

      // Resolve the remote host IP address for WebSocket
      const hostHeader = getHeaderValue(req.headers.host);
      // Extract hostname from host header (remove port if present)
      const hostname = this.extractHostnameFromHostHeader(hostHeader) || parsedUrl.hostname || 'unknown';
      const remoteHostIP = hostname !== 'unknown' ? await this.resolveHostIP(hostname) : 'unknown';

      const entry: WebSocketTrafficEntry = {
        id: connectionId,
        timestamp: new Date(req.timingEvents?.startTime || Date.now()),
        url: req.url,
        host: hostname,
        protocol: req.url.startsWith('wss') ? 'wss' : 'ws',
        headers: this.config.capture.captureHeaders ? { ...req.headers } : {},
        rawHeaders: this.config.capture.captureHeaders ? Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]) : [],
        connection: {
          established: new Date(req.timingEvents?.startTime || Date.now()),
        },
        messages: [],
        metadata: {
          clientIP: req.remoteIpAddress || req.remoteAddress || 'unknown',
          destination: this.emptyStringToNull(remoteHostIP),
        },
      };

      await this.storage.storeWebSocketTraffic(entry);

    } catch (error) {
      console.error('Failed to capture WebSocket upgrade:', error);
    }
  }

  private async captureWebSocketMessage(message: MockttpWebSocketMessage, direction: 'inbound' | 'outbound'): Promise<void> {
    try {
      if (!this.config.capture.captureWebSocketMessages) return;

      // Use streamId from mockttp WebSocket message to correlate with connection
      const connectionId = message.streamId;
      if (!connectionId) {
        console.warn('No streamId found for WebSocket message');
        return;
      }

      // Convert mockttp message format to our internal format
      const messageContent = message.content ? Buffer.from(message.content) : Buffer.alloc(0);
      const isBinary = message.isBinary || false;
      const messageData = {
        id: uuidv4(),
        timestamp: new Date(message.timingEvents?.startTime || Date.now()),
        direction,
        type: (isBinary ? 'binary' : 'text') as 'text' | 'binary' | 'ping' | 'pong' | 'close',
        data: this.processWebSocketMessageData(messageContent, isBinary),
        size: message.content ? message.content.length : 0,
      };

      await this.storage.addWebSocketMessage(connectionId, messageData);

    } catch (error) {
      console.error('Failed to capture WebSocket message:', error);
    }
  }

  private async captureWebSocketClose(closeEvent: MockttpWebSocketCloseEvent): Promise<void> {
    try {
      this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);

      const connectionId = closeEvent.streamId;
      if (!connectionId) {
        console.warn('No streamId found for WebSocket close event');
        return;
      }

      // Update the connection with close information
      const updates = {
        connection: {
          closed: new Date(),
          closeCode: closeEvent.closeCode,
          closeReason: closeEvent.closeReason || '',
        },
      };

      await this.storage.updateWebSocketConnection(connectionId, updates);

    } catch (error) {
      console.error('Failed to capture WebSocket close:', error);
    }
  }

  private async getRequestBody(req: MockttpRequest): Promise<string | undefined> {
    try {
      if (!req.body) {
        return undefined;
      }

      // Handle different body types from mockttp
      let bodyBuffer: Buffer | undefined;

      if (Buffer.isBuffer(req.body)) {
        bodyBuffer = req.body;
      } else if (typeof req.body === 'string') {
        bodyBuffer = Buffer.from(req.body);
      } else if (typeof req.body === 'object' && req.body !== null) {
        // Handle object with buffer property or getDecodedBuffer method
        const bodyObj = req.body as Record<string, unknown>;
        if (bodyObj.buffer && Buffer.isBuffer(bodyObj.buffer)) {
          bodyBuffer = bodyObj.buffer;
        } else if (typeof bodyObj.getDecodedBuffer === 'function') {
          try {
            bodyBuffer = await bodyObj.getDecodedBuffer();
          } catch (error) {
            console.error('Failed to get decoded buffer:', error);
          }
        }
      }

      if (!bodyBuffer) {
        return undefined;
      }

      // Process the request body with the same logic as response body
      const truncatedBody = bodyBuffer.length <= this.config.capture.maxBodySize ? bodyBuffer : bodyBuffer.subarray(0, this.config.capture.maxBodySize);
      const contentTypeHeader = req.headers?.['content-type'];
      const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader || '';
      const contentEncodingHeader = req.headers?.['content-encoding'];
      const contentEncoding = Array.isArray(contentEncodingHeader) ? contentEncodingHeader[0] : contentEncodingHeader;

      return await this.processBodyContent(truncatedBody, contentType, contentEncoding);
    } catch (error) {
      console.error('Failed to get request body:', error);
      return undefined;
    }
  }

  private async getResponseBody(res: MockttpResponse): Promise<string | undefined> {
    try {
      // Handle different body types from mockttp response
      let body: string | Buffer | undefined;

      if (!res.body) {
        return undefined;
      }

      if (Buffer.isBuffer(res.body)) {
        body = res.body;
      } else if (typeof res.body === 'string') {
        body = res.body;
      } else if (typeof res.body === 'object' && res.body !== null) {
        // Handle object with buffer/text/json properties
        const bodyObj = res.body as Record<string, unknown>;
        if (bodyObj.text && typeof bodyObj.text === 'string') {
          body = bodyObj.text;
        } else if (bodyObj.buffer && Buffer.isBuffer(bodyObj.buffer)) {
          body = bodyObj.buffer;
        } else if (bodyObj.json) {
          body = JSON.stringify(bodyObj.json);
        } else {
          // Try to convert the body object to string as fallback
          try {
            body = JSON.stringify(res.body);
          } catch (error) {
            console.error('Failed to convert body object to JSON:', error);
            return undefined;
          }
        }
      } else {
        return undefined;
      }

      // Process the body content with decompression and binary detection
      const contentTypeHeader = res.headers?.['content-type'];
      const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader || '';
      const contentEncodingHeader = res.headers?.['content-encoding'];
      const contentEncoding = Array.isArray(contentEncodingHeader) ? contentEncodingHeader[0] : contentEncodingHeader;

      if (Buffer.isBuffer(body)) {
        const truncatedBody = body.length <= this.config.capture.maxBodySize ? body : body.subarray(0, this.config.capture.maxBodySize);
        return await this.processBodyContent(truncatedBody, contentType, contentEncoding);
      }

      if (typeof body === 'string') {
        // For string bodies, we still need to check if they should be processed
        const buffer = Buffer.from(body);
        const truncatedBody = buffer.length <= this.config.capture.maxBodySize ? buffer : buffer.subarray(0, this.config.capture.maxBodySize);
        return await this.processBodyContent(truncatedBody, contentType, contentEncoding);
      }

      return undefined;
    } catch (error) {
      console.error('Failed to get response body:', error);
      return undefined;
    }
  }

  /**
   * Process WebSocket message data
   */
  private processWebSocketMessageData(buffer: Buffer, isBinary: boolean): string {
    try {
      if (isBinary) {
        // Binary WebSocket messages are stored as base64
        const base64Data = buffer.toString('base64');
        return `[BINARY:base64]${base64Data}`;
      } else {
        // Text WebSocket messages are stored as UTF-8
        return buffer.toString('utf8');
      }
    } catch (error) {
      console.error('Failed to process WebSocket message data:', error);
      // Fallback to base64
      const base64Data = buffer.toString('base64');
      return `[BINARY:base64]${base64Data}`;
    }
  }

  /**
   * Process body content with decompression and binary detection
   */
  private async processBodyContent(buffer: Buffer, contentType: string, contentEncoding?: string): Promise<string> {
    try {
      // Step 1: Decompress if needed
      let decompressedBuffer = buffer;
      let decompressionFailed = false;
      if (contentEncoding) {
        try {
          decompressedBuffer = await this.decompressContent(buffer, contentEncoding);
        } catch (_error) {
          decompressionFailed = true;
          decompressedBuffer = buffer; // Use original buffer
        }
      }

      // Step 2: Determine if content is binary (after decompression)
      // If decompression failed, treat as binary to prevent corrupted text storage
      const isBinary = decompressionFailed || this.isBinaryContentAfterDecompression(contentType, decompressedBuffer);

      // Step 3: Convert to appropriate string format
      if (isBinary) {
        const base64Data = decompressedBuffer.toString('base64');
        return `[BINARY:base64]${base64Data}`;
      } else {
        return decompressedBuffer.toString('utf8');
      }

    } catch (error) {
      console.error('Error processing body content:', error);
      // Fallback: treat as binary and encode as base64
      const base64Data = buffer.toString('base64');
      return `[BINARY:base64]${base64Data}`;
    }
  }

  /**
   * Decompress content based on content-encoding header
   */
  private async decompressContent(buffer: Buffer, encoding: string): Promise<Buffer> {
    const lowerEncoding = encoding.toLowerCase();

    try {
      switch (lowerEncoding) {
      case 'gzip':
        return gunzipSync(buffer);

      case 'deflate':
        return inflateSync(buffer);

      case 'br':
      case 'brotli':
        return brotliDecompressSync(buffer);

      case 'zstd':
        try {
          const decompressed = await zstdDecompress(buffer);
          return Buffer.from(decompressed);
        } catch (zstdError) {
          // If zstd decompression fails, we'll treat it as binary content
          // This prevents corrupted text storage
          throw zstdError;
        }

      default:
        return buffer;
      }
    } catch (error) {
      console.error(`Decompression failed for ${encoding}:`, error);
      // If decompression fails, return original buffer
      return buffer;
    }
  }

  /**
   * Determine if content is binary after decompression
   */
  private isBinaryContentAfterDecompression(contentType: string, buffer: Buffer): boolean {
    // Check content type first (after decompression, we should trust the content-type)
    const textContentTypes = [
      'text/',
      'application/json',
      'application/xml',
      'application/javascript',
      'application/x-javascript',
      'application/ecmascript',
      'application/x-www-form-urlencoded',
    ];

    const lowerContentType = contentType.toLowerCase();

    // If it's a known text type, treat as text
    if (textContentTypes.some(type => lowerContentType.includes(type))) {
      return false;
    }

    // Known binary types
    const binaryContentTypes = [
      'image/',
      'video/',
      'audio/',
      'application/pdf',
      'application/zip',
      'application/octet-stream',
      'application/x-binary',
      'application/x-msdownload',
      'application/x-executable',
    ];

    if (binaryContentTypes.some(type => lowerContentType.includes(type))) {
      return true;
    }

    // For unknown content types, use heuristic analysis
    return this.isBinaryContent(contentType, buffer);
  }

  private calculateRequestSize(req: MockttpRequest): number {
    try {
      let size = 0;

      // Add headers size
      if (req.headers) {
        size += JSON.stringify(req.headers).length;
      }

      // Add body size
      if (req.body) {
        if (Buffer.isBuffer(req.body)) {
          size += req.body.length;
        } else if (typeof req.body === 'string') {
          size += Buffer.from(req.body).length;
        }
      }

      return size;
    } catch (_error) {
      return 0;
    }
  }

  private async calculateResponseSize(res: MockttpResponse): Promise<number> {
    try {
      let size = 0;

      // Add headers size
      if (res.headers) {
        size += JSON.stringify(res.headers).length;
      }

      // Add actual body size (decompressed if applicable)
      if (res.body) {
        let bodyBuffer: Buffer | undefined;

        // Handle different body types
        if (typeof res.body === 'object' && res.body !== null && !Buffer.isBuffer(res.body)) {
          // Body is an object with buffer/text properties
          const bodyObj = res.body as { buffer?: Buffer; text?: string };
          if (bodyObj.buffer) {
            bodyBuffer = bodyObj.buffer;
          } else if (bodyObj.text) {
            bodyBuffer = Buffer.from(bodyObj.text);
          }
        } else if (Buffer.isBuffer(res.body)) {
          bodyBuffer = res.body;
        } else if (typeof res.body === 'string') {
          bodyBuffer = Buffer.from(res.body);
        }

        if (bodyBuffer) {
          // If content is compressed, calculate decompressed size
          const contentEncodingHeader = res.headers?.['content-encoding'];
          const contentEncoding = Array.isArray(contentEncodingHeader) ? contentEncodingHeader[0] : contentEncodingHeader;
          if (contentEncoding) {
            try {
              const decompressed = await this.decompressContent(bodyBuffer, contentEncoding);
              size += decompressed.length;
            } catch (_error) {
              // If decompression fails, use original size
              size += bodyBuffer.length;
            }
          } else {
            size += bodyBuffer.length;
          }
        }
      }

      return size;
    } catch (_error) {
      return 0;
    }
  }

  /**
   * Determine if content is binary based on content type and data characteristics
   */
  private isBinaryContent(contentType: string, buffer: Buffer): boolean {
    // Check content type first
    const binaryContentTypes = [
      'image/',
      'video/',
      'audio/',
      'application/pdf',
      'application/zip',
      'application/gzip',
      'application/x-gzip',
      'application/octet-stream',
      'application/x-binary',
      'application/x-msdownload',
      'application/x-executable',
    ];

    const lowerContentType = contentType.toLowerCase();
    if (binaryContentTypes.some(type => lowerContentType.includes(type))) {
      return true;
    }

    // Check for compressed content (gzip, deflate)
    if (lowerContentType.includes('gzip') || lowerContentType.includes('deflate')) {
      return true;
    }

    // Heuristic: check for non-printable characters in the first 512 bytes
    const sampleSize = Math.min(512, buffer.length);
    const sample = buffer.subarray(0, sampleSize);

    let nonPrintableCount = 0;
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Count bytes that are not printable ASCII (except common whitespace)
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        nonPrintableCount++;
      } else if (byte > 126) {
        nonPrintableCount++;
      }
    }

    // If more than 30% of the sample contains non-printable characters, consider it binary
    const binaryThreshold = 0.3;
    return (nonPrintableCount / sample.length) > binaryThreshold;
  }

  getStatus(): ProxyStatus {
    return {
      isRunning: !!this.server,
      httpPort: this.config.proxy.httpPort,
      httpsPort: this.config.proxy.httpsPort,
      startTime: this.startTime,
      config: this.config,
      stats: { ...this.stats },
    };
  }

  /**
   * Get the generated CA certificate for browser trust installation
   */
  getGeneratedCA(): { cert: string; key: string } | undefined {
    return this.generatedCA;
  }
}
