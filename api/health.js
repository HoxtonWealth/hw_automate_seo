/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * No authentication required - used to verify the API is running
 */
export default async function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Hoxton SEO Platform is running',
    timestamp: new Date().toISOString()
  });
}
