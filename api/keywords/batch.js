import { supabase } from '../../lib/supabase.js';
import { verifyApiKey } from '../../lib/auth.js';
import { success, error } from '../../lib/response.js';
import { UnauthorizedError, ValidationError, mapSupabaseError } from '../../lib/errors.js';
import { validateRequired, validateType, validateMethod, validateEnum } from '../../lib/validate.js';

const VALID_COUNTRIES = ['UK', 'US', 'UAE', 'AU', 'CA', 'SG', 'HK'];

/**
 * Batch Keywords Endpoint
 * POST /api/keywords/batch
 * 
 * Add keywords in bulk
 * Body: { 
 *   keywords: ['keyword1', 'keyword2', ...], 
 *   country: 'UK',
 *   cluster: 'Tools',  // optional
 *   page_id: 'uuid'    // optional
 * }
 */
export default async function handler(req, res) {
  try {
    // Auth check
    if (!verifyApiKey(req)) {
      throw new UnauthorizedError();
    }

    // Method check
    validateMethod(req, 'POST');

    // Validate payload
    validateRequired(req.body, ['keywords', 'country']);
    validateType(req.body.keywords, 'keywords', 'array');
    validateEnum(req.body.country.toUpperCase(), 'country', VALID_COUNTRIES);

    const { keywords, country, cluster = null, page_id = null } = req.body;

    if (keywords.length === 0) {
      throw new ValidationError('Keywords array cannot be empty');
    }

    if (keywords.length > 1000) {
      throw new ValidationError('Maximum 1000 keywords per batch', {
        received: keywords.length,
        maximum: 1000
      });
    }

    // Prepare keywords for insert
    const preparedKeywords = keywords.map(kw => ({
      keyword_text: kw.trim().toLowerCase(),
      country: country.toUpperCase(),
      cluster,
      page_id
    }));

    // Upsert to handle duplicates (keyword_text + country unique)
    const { data, error: dbError } = await supabase
      .from('keywords')
      .upsert(preparedKeywords, { 
        onConflict: 'keyword_text,country',
        ignoreDuplicates: false 
      })
      .select();

    if (dbError) {
      throw mapSupabaseError(dbError, 'upsert');
    }

    return success(res, data, { 
      count: data.length,
      message: `Successfully added ${data.length} keywords`
    });

  } catch (err) {
    return error(res, err);
  }
}
