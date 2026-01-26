/**
 * Google Chat API Client
 * Handles authentication via Service Account and provides methods
 * to send direct messages to users via Google Chat API.
 * 
 * Required environment variables:
 * - GOOGLE_CHAT_SERVICE_ACCOUNT_JSON: Base64-encoded JSON of the service account key
 *   OR (preferred to avoid Netlify env size limits):
 * - GOOGLE_CHAT_SERVICE_ACCOUNT_BUCKET: Supabase Storage bucket (default: "secrets")
 * - GOOGLE_CHAT_SERVICE_ACCOUNT_OBJECT: Object path in bucket (e.g. "google-chat-service-account.json")
 * - SUPABASE_URL: Supabase project URL (for Storage download)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (for Storage download)
 * - APP_DOMAIN: (optional) Domain for deep links in messages (defaults to app.grupoggv.com)
 * 
 * Setup Guide:
 * 1. Go to Google Cloud Console > APIs & Services > Enable Google Chat API
 * 2. Create a Chat App in Google Chat API configuration
 * 3. Create a Service Account with Chat scope
 * 4. Download JSON key and encode with: base64 -w0 service-account.json
 * 5. Set the encoded value as GOOGLE_CHAT_SERVICE_ACCOUNT_JSON in Netlify env vars
 */

const GOOGLE_CHAT_API_BASE = 'https://chat.googleapis.com/v1';

// Scopes required for Chat bot messaging
const CHAT_SCOPES = ['https://www.googleapis.com/auth/chat.bot'];

/**
 * Simple JWT generator for Google Service Account auth
 * Uses native crypto instead of external libraries for Netlify compatibility
 */
class GoogleServiceAccountAuth {
  constructor(credentials) {
    this.credentials = credentials;
    this.cachedToken = null;
    this.tokenExpiry = 0;
  }

  /**
   * Get a valid access token, refreshing if needed
   */
  async getAccessToken() {
    const now = Date.now();
    
    // Return cached token if still valid (with 5min buffer)
    if (this.cachedToken && this.tokenExpiry > now + 300000) {
      return this.cachedToken;
    }

    // Generate new JWT and exchange for access token
    const jwt = await this._createSignedJwt();
    const token = await this._exchangeJwtForToken(jwt);
    
    this.cachedToken = token.access_token;
    this.tokenExpiry = now + (token.expires_in * 1000);
    
    return this.cachedToken;
  }

  /**
   * Create a signed JWT for service account authentication
   */
  async _createSignedJwt() {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600; // 1 hour

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: this.credentials.private_key_id
    };

    const payload = {
      iss: this.credentials.client_email,
      sub: this.credentials.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: CHAT_SCOPES.join(' ')
    };

    const headerB64 = this._base64UrlEncode(JSON.stringify(header));
    const payloadB64 = this._base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Sign with private key using Node.js crypto
    const crypto = require('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(unsignedToken);
    const signature = sign.sign(this.credentials.private_key, 'base64');
    const signatureB64 = this._base64ToBase64Url(signature);

    return `${unsignedToken}.${signatureB64}`;
  }

  /**
   * Exchange JWT for access token via Google OAuth
   */
  async _exchangeJwtForToken(jwt) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    return response.json();
  }

  _base64UrlEncode(str) {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  _base64ToBase64Url(base64) {
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

/**
 * Google Chat API Client
 */
class GoogleChatClient {
  constructor() {
    this.auth = null;
    this._initPromise = null;
    this._initAuthFromEnv();
  }

  _initAuthFromEnv() {
    const credentialsB64 = process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_JSON;
    
    if (!credentialsB64) {
      return;
    }

    try {
      const credentialsJson = Buffer.from(credentialsB64, 'base64').toString('utf-8');
      const credentials = JSON.parse(credentialsJson);
      this.auth = new GoogleServiceAccountAuth(credentials);
      console.log('✅ Google Chat client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google Chat auth:', error.message);
    }
  }

  /**
   * Check if the client is properly configured
   */
  isConfigured() {
    return Boolean(
      this.auth ||
      process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_OBJECT
    );
  }

  async _ensureAuth() {
    if (this.auth) return;
    if (this._initPromise) {
      await this._initPromise;
      return;
    }
    this._initPromise = this._initAuthFromStorage();
    await this._initPromise;
  }

  async _initAuthFromStorage() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_BUCKET || 'secrets';
    const objectPath = process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_OBJECT;

    if (!supabaseUrl || !serviceRoleKey || !objectPath) {
      console.warn('⚠️ Google Chat storage credentials not configured');
      return;
    }

    try {
      const encodedPath = encodeURIComponent(objectPath).replace(/%2F/g, '/');
      const url = `${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`;
      const response = await fetch(url, {
        headers: {
          authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Storage fetch failed: ${response.status} ${errorText}`);
      }

      const raw = await response.text();
      const credentials = this._parseCredentials(raw);
      if (!credentials) {
        throw new Error('Failed to parse credentials from Storage');
      }

      this.auth = new GoogleServiceAccountAuth(credentials);
      console.log('✅ Google Chat client initialized (Supabase Storage)');
    } catch (error) {
      console.error('❌ Failed to initialize Google Chat auth from Storage:', error.message);
    }
  }

  _parseCredentials(raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf-8');
        return JSON.parse(decoded);
      } catch (err) {
        return null;
      }
    }
  }

  /**
   * Find or create a DM space with a user
   * Uses spaces.setup which creates if not exists, returns existing if it does
   * 
   * @param {string} userEmail - The user's email address
   * @returns {Promise<{spaceName: string, displayName: string}>}
   */
  async findOrCreateDmSpace(userEmail) {
    await this._ensureAuth();
    if (!this.auth) {
      throw new Error('Google Chat client not configured');
    }

    const token = await this.auth.getAccessToken();

    // Use spaces.setup to create/get DM space
    // Reference: https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces/setup
    const response = await fetch(`${GOOGLE_CHAT_API_BASE}/spaces:setup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        space: {
          spaceType: 'DIRECT_MESSAGE'
        },
        memberships: [
          {
            member: {
              name: `users/${userEmail}`,
              type: 'HUMAN'
            }
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to setup DM space: ${error.error?.message || response.status}`);
    }

    const space = await response.json();
    console.log(`✅ DM space ready: ${space.name}`);
    
    return {
      spaceName: space.name,
      displayName: space.displayName || userEmail
    };
  }

  /**
   * Send a text message to a space
   * 
   * @param {string} spaceName - The space resource name (e.g., spaces/XXXXX)
   * @param {string} text - Message text (supports basic formatting)
   * @returns {Promise<object>} - The created message
   */
  async sendTextMessage(spaceName, text) {
    if (!this.isConfigured()) {
      throw new Error('Google Chat client not configured');
    }

    const token = await this.auth.getAccessToken();

    const response = await fetch(`${GOOGLE_CHAT_API_BASE}/${spaceName}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to send message: ${error.error?.message || response.status}`);
    }

    const message = await response.json();
    console.log(`✅ Message sent: ${message.name}`);
    
    return message;
  }

  /**
   * Send a card message (rich format) to a space
   * 
   * @param {string} spaceName - The space resource name
   * @param {object} card - Card definition (cardsV2 format)
   * @param {string} [fallbackText] - Fallback text for notifications
   * @returns {Promise<object>} - The created message
   */
  async sendCardMessage(spaceName, card, fallbackText = '') {
    if (!this.isConfigured()) {
      throw new Error('Google Chat client not configured');
    }

    const token = await this.auth.getAccessToken();

    const response = await fetch(`${GOOGLE_CHAT_API_BASE}/${spaceName}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: fallbackText,
        cardsV2: [card]
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to send card message: ${error.error?.message || response.status}`);
    }

    const message = await response.json();
    console.log(`✅ Card message sent: ${message.name}`);
    
    return message;
  }

  /**
   * Send a direct message to a user by email
   * This is a convenience method that finds/creates the DM space and sends the message
   * 
   * @param {string} userEmail - The recipient's email
   * @param {string} text - Message text
   * @returns {Promise<{spaceName: string, message: object}>}
   */
  async sendDirectMessage(userEmail, text) {
    const space = await this.findOrCreateDmSpace(userEmail);
    const message = await this.sendTextMessage(space.spaceName, text);
    return { spaceName: space.spaceName, message };
  }

  /**
   * Send a direct card message to a user by email
   * 
   * @param {string} userEmail - The recipient's email
   * @param {object} card - Card definition
   * @param {string} [fallbackText] - Fallback text
   * @returns {Promise<{spaceName: string, message: object}>}
   */
  async sendDirectCardMessage(userEmail, card, fallbackText = '') {
    const space = await this.findOrCreateDmSpace(userEmail);
    const message = await this.sendCardMessage(space.spaceName, card, fallbackText);
    return { spaceName: space.spaceName, message };
  }
}

// Singleton instance
let clientInstance = null;

/**
 * Get the Google Chat client singleton
 * @returns {GoogleChatClient}
 */
function getGoogleChatClient() {
  if (!clientInstance) {
    clientInstance = new GoogleChatClient();
  }
  return clientInstance;
}

/**
 * Get the app domain for deep links
 * @returns {string}
 */
function getAppDomain() {
  return process.env.APP_DOMAIN || process.env.VITE_APP_DOMAIN || 'app.grupoggv.com';
}

module.exports = {
  GoogleChatClient,
  getGoogleChatClient,
  getAppDomain
};
