import { supabase } from '../../lib/supabase.js';
import { verifyApiKey } from '../../lib/auth.js';
import { success, error } from '../../lib/response.js';
import { UnauthorizedError, ValidationError, ExternalApiError, mapSupabaseError } from '../../lib/errors.js';
import { validateRequired, validateType, validateMethod, validateEnum } from '../../lib/validate.js';
import { getKeywordMetrics, COUNTRY_TO_LOCATION } from '../../lib/dataforseo.js';

/**
 * Enrich Keywords Endpoint
 * POST /api/enrich/keywords
 * 
 * Fetch keyword metrics from DataForSEO and store in database
 * Body: { 
 *   keyword_ids: ['uuid1', 'uuid2', ...],  // OR
 *   keywords: [{ text: 'keyword', country: 'UK' }, ...]
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

    const { keyword_ids, keywords } = req.body;

    // Must provide either keyword_ids or keywords
    if (!keyword_ids && !keywords) {
      throw new ValidationError('Must provide either keyword_ids or keywords array');
    }

    let keywordsToEnrich = [];

    // If keyword_ids provided, fetch from database
    if (keyword_ids && keyword_ids.length > 0) {
      const { data, error: dbError } = await supabase
        .from('keywords')
        .select('id, keyword_text, country')
        .in('id', keyword_ids);

      if (dbError) {
        throw mapSupabaseError(dbError, 'select');
      }

      keywordsToEnrich = data;
    } else if (keywords && keywords.length > 0) {
      keywordsToEnrich = keywords.map(k => ({
        id: null,
        keyword_text: k.text,
        country: k.country
      }));
    }

    if (keywordsToEnrich.length === 0) {
      throw new ValidationError('No keywords found to enrich');
    }

    if (keywordsToEnrich.length > 100) {
      throw new ValidationError('Maximum 100 keywords per request', {
        received: keywordsToEnrich.length,
        maximum: 100
      });
    }

    // Group by country for efficient API calls
    const byCountry = keywordsToEnrich.reduce((acc, kw) => {
      const country = kw.country || 'UK';
      if (!acc[country]) acc[country] = [];
      acc[country].push(kw);
      return acc;
    }, {});

    // Fetch from DataForSEO
    const results = [];
    
    for (const [country, kws] of Object.entries(byCountry)) {
      const locationCode = COUNTRY_TO_LOCATION[country] || 2826;

      const response = await getKeywordMetrics(kws.map(k => k.keyword_text), locationCode);

      // Process results and store metrics
      for (const result of response || []) {
        const keyword = kws.find(k => 
          k.keyword_text.toLowerCase() === result.keyword.toLowerCase()
        );

        if (keyword && keyword.id) {
          // Store metrics
          const { error: insertError } = await supabase
            .from('keyword_metrics')
            .insert({
              keyword_id: keyword.id,
              search_volume: result.search_volume || 0,
              difficulty: result.keyword_difficulty || 0,
              cpc: result.cpc || 0,
              competition: result.competition || 0
            });

          if (insertError) {
            console.error('Failed to insert metrics:', insertError);
          }
        }

        results.push({
          keyword: result.keyword,
          country,
          search_volume: result.search_volume || 0,
          difficulty: result.keyword_difficulty || 0,
          cpc: result.cpc || 0,
          competition: result.competition || 0
        });
      }
    }

    return success(res, results, { 
      count: results.length,
      message: `Enriched ${results.length} keywords`
    });

  } catch (err) {
    return error(res, err);
  }
}
