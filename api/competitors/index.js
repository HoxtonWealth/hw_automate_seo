import { supabase } from '../../lib/supabase.js';
import { verifyApiKey } from '../../lib/auth.js';
import { success, error } from '../../lib/response.js';
import { UnauthorizedError, ValidationError, mapSupabaseError } from '../../lib/errors.js';
import { validateRequired, validateMethod } from '../../lib/validate.js';

/**
 * Competitors Endpoint
 * GET /api/competitors - List all competitors
 * POST /api/competitors - Add a new competitor
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
 * GET /api/competitors
 */
async function handleGet(req, res) {
  const { data, error: dbError } = await supabase
    .from('competitors')
    .select('*')
    .order('name');
  
  if (dbError) {
    throw dbError;
  }
  
  return success(res, data, { count: data.length });
}

/**
 * POST /api/competitors
 * Body: { domain: 'example.com', name: 'Example Inc', notes: 'optional notes' }
 */
async function handlePost(req, res) {
  validateRequired(req.body, ['domain', 'name']);

  const { domain, name, notes = null } = req.body;

  // Clean domain (remove protocol and trailing slash)
  const cleanDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .toLowerCase();

  const { data, error: dbError } = await supabase
    .from('competitors')
    .insert({
      domain: cleanDomain,
      name,
      notes
    })
    .select()
    .single();

  if (dbError) {
    throw mapSupabaseError(dbError, 'insert');
  }

  return success(res, data, { message: `Competitor "${name}" added successfully` });
}
