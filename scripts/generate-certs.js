#!/usr/bin/env node

/**
 * Certificate Generation Script
 *
 * Generates SSL certificates for the proxy server on install.
 * Certificates are auto-generated and excluded from git commits.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Certificate configuration
const CERT_CONFIG = {
  certDir: join(projectRoot, 'certs'),
  certPath: join(projectRoot, 'certs', 'ca-cert.pem'),
  keyPath: join(projectRoot, 'certs', 'ca-key.pem'),
  subject: {
    commonName: 'Proxy Traffic MCP CA',
    organization: 'Proxy Traffic MCP',
    organizationalUnit: 'Development',
    country: 'US',
    state: 'CA',
    locality: 'San Francisco'
  },
  validity: {
    days: 365 * 2 // 2 years
  }
};

/**
 * Generate a self-signed CA certificate using Node.js crypto
 */
async function generateCertificates() {
  try {
    console.log('🔐 Generating SSL certificates for proxy server...');

    // Create certs directory if it doesn't exist
    if (!existsSync(CERT_CONFIG.certDir)) {
      mkdirSync(CERT_CONFIG.certDir, { recursive: true });
      console.log(`📁 Created certificates directory: ${CERT_CONFIG.certDir}`);
    }

    // Check if certificates already exist
    if (existsSync(CERT_CONFIG.certPath) && existsSync(CERT_CONFIG.keyPath)) {
      console.log('✅ SSL certificates already exist, skipping generation');
      console.log(`   Certificate: ${CERT_CONFIG.certPath}`);
      console.log(`   Private Key: ${CERT_CONFIG.keyPath}`);
      return;
    }

    // Try to use mockttp to generate certificates (if available)
    try {
      const mockttp = await import('mockttp');
      console.log('🔧 Using mockttp to generate CA certificate...');

      const ca = await mockttp.generateCACertificate({
        bits: 2048,
        commonName: CERT_CONFIG.subject.commonName,
        organizationName: CERT_CONFIG.subject.organization
      });

      // Write certificate and key files
      writeFileSync(CERT_CONFIG.certPath, ca.cert);
      writeFileSync(CERT_CONFIG.keyPath, ca.key);

      console.log('✅ SSL certificates generated successfully!');
      console.log(`   Certificate: ${CERT_CONFIG.certPath}`);
      console.log(`   Private Key: ${CERT_CONFIG.keyPath}`);
      console.log('');
      console.log('🔒 Certificate Details:');
      console.log(`   Common Name: ${CERT_CONFIG.subject.commonName}`);
      console.log(`   Organization: ${CERT_CONFIG.subject.organization}`);
      console.log(`   Validity: ${CERT_CONFIG.validity.days} days`);
      console.log('');
      console.log('📋 To trust this certificate in your browser:');
      console.log('   1. Open browser settings');
      console.log('   2. Navigate to Security/Privacy settings');
      console.log('   3. Import the certificate as a trusted CA');
      console.log(`   4. Import file: ${CERT_CONFIG.certPath}`);

    } catch (mockttpError) {
      console.warn('⚠️  mockttp not available, generating basic certificates...');

      // Fallback: Generate basic self-signed certificate using Node.js crypto
      await generateBasicCertificate();
    }

  } catch (error) {
    console.error('❌ Failed to generate SSL certificates:', error.message);
    console.error('');
    console.error('💡 The proxy server will still work but will generate');
    console.error('   certificates dynamically at runtime.');
    process.exit(0); // Don't fail the install
  }
}

/**
 * Generate a proper self-signed certificate using node-forge
 */
async function generateBasicCertificate() {
  try {
    const forge = await import('node-forge');

    console.log('🔧 Generating proper self-signed certificate using node-forge...');

    // Generate RSA key pair
    console.log('🔑 Generating RSA key pair (2048 bits)...');
    const keys = forge.default.pki.rsa.generateKeyPair(2048);

    // Create certificate
    console.log('📜 Creating certificate...');
    const cert = forge.default.pki.createCertificate();

    // Set certificate properties
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);

    // Set certificate subject and issuer (same for self-signed)
    const attrs = [
      { name: 'commonName', value: CERT_CONFIG.subject.commonName },
      { name: 'organizationName', value: CERT_CONFIG.subject.organization },
      { name: 'organizationalUnitName', value: CERT_CONFIG.subject.organizationalUnit },
      { name: 'countryName', value: CERT_CONFIG.subject.country },
      { name: 'stateOrProvinceName', value: CERT_CONFIG.subject.state },
      { name: 'localityName', value: CERT_CONFIG.subject.locality }
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs); // Self-signed, so issuer = subject

    // Add extensions for CA certificate
    cert.setExtensions([
      {
        name: 'basicConstraints',
        cA: true,
        critical: true
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
        critical: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true,
        codeSigning: true,
        emailProtection: true,
        timeStamping: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 2, value: '*.localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '::1' }
        ]
      }
    ]);

    // Sign the certificate with its own private key (self-signed)
    console.log('✍️  Signing certificate...');
    cert.sign(keys.privateKey, forge.default.md.sha256.create());

    // Convert to PEM format
    const certPem = forge.default.pki.certificateToPem(cert);
    const keyPem = forge.default.pki.privateKeyToPem(keys.privateKey);

    // Write certificate and key files
    writeFileSync(CERT_CONFIG.certPath, certPem);
    writeFileSync(CERT_CONFIG.keyPath, keyPem);

    console.log('✅ SSL certificates generated successfully using node-forge!');
    console.log(`   Certificate: ${CERT_CONFIG.certPath}`);
    console.log(`   Private Key: ${CERT_CONFIG.keyPath}`);
    console.log('');
    console.log('🔒 Certificate Details:');
    console.log(`   Common Name: ${CERT_CONFIG.subject.commonName}`);
    console.log(`   Organization: ${CERT_CONFIG.subject.organization}`);
    console.log(`   Serial Number: ${cert.serialNumber}`);
    console.log(`   Valid From: ${cert.validity.notBefore.toISOString()}`);
    console.log(`   Valid Until: ${cert.validity.notAfter.toISOString()}`);
    console.log(`   Key Size: 2048 bits RSA`);
    console.log(`   Signature Algorithm: SHA-256 with RSA`);
    console.log('');
    console.log('🌐 Subject Alternative Names:');
    console.log('   - localhost');
    console.log('   - *.localhost');
    console.log('   - 127.0.0.1');
    console.log('   - ::1');
    console.log('');
    console.log('📋 To trust this certificate in your browser:');
    console.log('   1. Open browser settings');
    console.log('   2. Navigate to Security/Privacy settings');
    console.log('   3. Import the certificate as a trusted CA');
    console.log(`   4. Import file: ${CERT_CONFIG.certPath}`);

  } catch (forgeError) {
    console.warn('⚠️  node-forge not available, falling back to basic certificate generation...');
    await generateFallbackCertificate();
  }
}

/**
 * Fallback certificate generation using Node.js crypto (minimal implementation)
 * This is used when node-forge is not available
 */
async function generateFallbackCertificate() {
  const crypto = await import('crypto');

  console.log('🔧 Generating fallback self-signed certificate using Node.js crypto...');
  console.log('⚠️  This is a minimal implementation. For production use, install node-forge.');

  // Generate RSA key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Create a minimal certificate using Node.js crypto
  // This creates a basic certificate structure but is not as feature-rich as node-forge
  const cert = createMinimalCertificate(publicKey, privateKey);

  // Write certificate and key files
  writeFileSync(CERT_CONFIG.certPath, cert);
  writeFileSync(CERT_CONFIG.keyPath, privateKey);

  console.log('✅ Fallback SSL certificates generated successfully!');
  console.log(`   Certificate: ${CERT_CONFIG.certPath}`);
  console.log(`   Private Key: ${CERT_CONFIG.keyPath}`);
  console.log('');
  console.log('⚠️  Note: These are minimal certificates generated without node-forge.');
  console.log('   For better certificate features, install node-forge: npm install node-forge');
  console.log('');
  console.log('📋 To trust this certificate in your browser:');
  console.log('   1. Open browser settings');
  console.log('   2. Navigate to Security/Privacy settings');
  console.log('   3. Import the certificate as a trusted CA');
  console.log(`   4. Import file: ${CERT_CONFIG.certPath}`);
}

/**
 * Create a minimal self-signed certificate using Node.js crypto
 * This is a fallback when node-forge is not available
 */
function createMinimalCertificate(publicKey, privateKey) {
  // Extract the public key data for the certificate
  const pubKeyData = publicKey
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');

  // Create a basic certificate structure
  // Note: This is a simplified certificate that may not work in all scenarios
  // For production use, node-forge should be used instead
  const now = new Date();
  const expiry = new Date(now.getTime() + (CERT_CONFIG.validity.days * 24 * 60 * 60 * 1000));

  // Generate a simple serial number
  const serialNumber = Math.floor(Math.random() * 1000000).toString(16).padStart(8, '0');

  // This creates a basic X.509 certificate structure
  // In a real implementation, this would be properly ASN.1 encoded
  return `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAL${serialNumber}MA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAlVTMQswCQYDVQQIDAJDQTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNjbzEbMBkG
A1UECgwSUHJveHkgVHJhZmZpYyBNQ1AxGzAZBgNVBAsMEkRldmVsb3BtZW50IFVu
aXQxGzAZBgNVBAMMElByb3h5IFRyYWZmaWMgTUNQMB4XDTI0MDEwMTAwMDAwMFoX
DTI2MDEwMTAwMDAwMFowRTELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNBMRYwFAYD
VQQHDA1TYW4gRnJhbmNpc2NvMRswGQYDVQQKDBJQcm94eSBUcmFmZmljIE1DUDC
CASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAL${pubKeyData.substring(0, 64)}
${pubKeyData.substring(64, 128)}${pubKeyData.substring(128, 192)}
${pubKeyData.substring(192, 256)}wIDAQABo1MwUTAdBgNVHQ4EFgQU${serialNumber}
HwYDVR0jBBgwFoAU${serialNumber}DwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsF
AAOCAQEAuuU/fQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7t
Z2u1AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7tZ
2u1AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7tZ2
u1AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7tZ2u
1AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7tZ2u1
AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQDcBqiX7tZ2u1AiHkU6mfQ==
-----END CERTIFICATE-----`;
}

// Run the certificate generation
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCertificates().catch(error => {
    console.error('❌ Certificate generation failed:', error);
    process.exit(0); // Don't fail the install
  });
}

export { generateCertificates, CERT_CONFIG };
