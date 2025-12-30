/**
 * Verify the API key from request headers
 * @param {object} req - Request object
 * @returns {boolean} - True if valid, false otherwise
 */
export function verifyApiKey(req) {
  const apiKey = req.headers['x-api-key'];
  return apiKey === process.env.API_KEY;
}
