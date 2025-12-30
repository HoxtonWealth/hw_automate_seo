import { supabase } from '../../lib/supabase.js';
import { verifyApiKey } from '../../lib/auth.js';
import { success, error } from '../../lib/response.js';
import { UnauthorizedError, ValidationError } from '../../lib/errors.js';

/**
 * Pages Endpoint
 * GET /api/pages - List all pages
 * POST /api/pages - Create a new page
 */
export default async function handler(req, res) {
  try {
    // Auth check
    if (!verifyApiKey(req)) {
      throw new UnauthorizedError();
    }

    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      default:
        throw new ValidationError(`Method ${req.method} not allowed`, {
          allowed: ['GET', 'POST']
        });
    }
  } catch (err) {
    return error(res, err);
  }
}

/**
 * GET /api/pages
 * Query params: cluster, level
 */
async function handleGet(req, res) {
  const { cluster, level } = req.query;
  
  let query = supabase
    .from('pages')
    .select('*')
    .order('cluster')
    .order('level');
  
  if (cluster) {
    query = query.eq('cluster', cluster);
  }
  
  if (level) {
    query = query.eq('level', parseInt(level, 10));
  }
  
  const { data, error: dbError } = await query;
  
  if (dbError) {
    throw dbError;
  }
  
  return success(res, data, { count: data.length });
}

/**
 * POST /api/pages
 * Body: { page_name, url, cluster, level, parent_page, content_focus, ... }
 */
async function handlePost(req, res) {
  const { 
    page_name, 
    url, 
    cluster, 
    level = 2,
    parent_page = null,
    sibling_links = null,
    cross_cluster_links = null,
    content_focus = null
  } = req.body;
  
  if (!page_name || !url || !cluster) {
    throw new ValidationError('Missing required fields', {
      required: ['page_name', 'url', 'cluster']
    });
  }
  
  const { data, error: dbError } = await supabase
    .from('pages')
    .insert({
      page_name,
      url,
      cluster,
      level,
      parent_page,
      sibling_links,
      cross_cluster_links,
      content_focus
    })
    .select()
    .single();
  
  if (dbError) {
    throw dbError;
  }
  
  return success(res, data);
}
