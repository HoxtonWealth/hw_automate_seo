import { supabase } from '../../lib/supabase.js';
import { verifyApiKey } from '../../lib/auth.js';
import { success, error } from '../../lib/response.js';
import { UnauthorizedError, ValidationError } from '../../lib/errors.js';

/**
 * Keywords Endpoint
 * GET /api/keywords - List keywords with optional filters
 * 
 * Query params:
 *   - country: Filter by country (UK, US, UAE)
 *   - cluster: Filter by content cluster
 *   - page_id: Filter by page ID
 *   - limit: Max results (default 100)
 *   - offset: Pagination offset
 */
export default async function handler(req, res) {
  try {
    // Auth check
    if (!verifyApiKey(req)) {
      throw new UnauthorizedError();
    }

    if (req.method !== 'GET') {
      throw new ValidationError(`Method ${req.method} not allowed`, {
        allowed: ['GET']
      });
    }

    const { 
      country, 
      cluster, 
      page_id,
      limit = 100, 
      offset = 0 
    } = req.query;

    // Build query with joins to get latest metrics
    let query = supabase
      .from('keywords')
      .select(`
        *,
        pages (
          id,
          page_name,
          url,
          cluster
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

    // Apply filters
    if (country) {
      query = query.eq('country', country.toUpperCase());
    }
    
    if (cluster) {
      query = query.eq('cluster', cluster);
    }

    if (page_id) {
      query = query.eq('page_id', page_id);
    }

    const { data, error: dbError, count } = await query;

    if (dbError) {
      throw dbError;
    }

    return success(res, data, { 
      count: data.length,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

  } catch (err) {
    return error(res, err);
  }
}
