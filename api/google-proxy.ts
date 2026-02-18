import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Serverless function to proxy Google Maps API requests.
 * This solves the CORS issue by making requests from the server side.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 1. Get the endpoint from the query parameter (set by vercel.json rewrite)
        // URL: /api/google-proxy?endpoint=maps/api/place/textsearch/json&key=...
        // The 'key' parameter comes from the client request (appended by Vercel rewrite)
        const { endpoint, key, ...otherQueryParams } = req.query;

        if (!endpoint || Array.isArray(endpoint)) {
            return res.status(400).json({
                error: 'Invalid endpoint parameter',
                status: 'INVALID_REQUEST'
            });
        }

        // 2. Validate API Key from Client
        // We now require the client to send the key (which they do via the query param)
        const clientApiKey = key;

        if (!clientApiKey) {
            return res.status(401).json({
                error: 'API Key missing. Please provide your Google Places API Key in the application settings.',
                status: 'REQUEST_DENIED'
            });
        }
        
        // Additional validation: check if the API key has a valid format (starts with "AIza...")
        const apiKeyValue = Array.isArray(clientApiKey) ? clientApiKey[0] : clientApiKey;
        if (!apiKeyValue.startsWith('AIza')) {
            console.error('[Proxy] Invalid API key format received');
            return res.status(401).json({
                error: 'API Key format invalid. Google API keys should start with "AIza".',
                status: 'REQUEST_DENIED'
            });
        }

        // 3. Reconstruct the full Google API URL
        let googleApiUrl = `https://maps.googleapis.com/${endpoint}`;

        // 4. Add query parameters
        const queryParams = new URLSearchParams();

        // Add all other query params from the request
        Object.entries(otherQueryParams).forEach(([k, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(k, v));
            } else if (value) {
                queryParams.append(k, value);
            }
        });

        // Add the API Key (explicitly from the client request)
        if (Array.isArray(clientApiKey)) {
            queryParams.set('key', clientApiKey[0]);
        } else if (clientApiKey) {
            queryParams.set('key', clientApiKey);
        }

        googleApiUrl += `?${queryParams.toString()}`;

        // Log masked URL for debugging
        const maskedUrl = googleApiUrl.replace(/key=([^&]*)/, 'key=API_KEY_HIDDEN');
        console.log('[Proxy] Original URL:', req.url); // Use req.url for original URL
        console.log('[Proxy] Google API path:', endpoint); // Use endpoint for Google API path
        console.log('[Proxy] Forwarding to:', maskedUrl);

        // Make the request to Google API
        const response = await fetch(googleApiUrl, {
            method: req.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        console.log('[Proxy] Response status:', response.status);
        console.log('[Proxy] Response data status:', data.status);

        // Return the response
        return res.status(response.status).json(data);

    } catch (error: any) {
        console.error('[Proxy] Error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error',
            status: 'UNKNOWN_ERROR'
        });
    }
}
