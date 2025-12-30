import { supabase } from '../../lib/supabase.js';
import { verifyApiKey } from '../../lib/auth.js';
import { success, error } from '../../lib/response.js';
import { UnauthorizedError, ValidationError, ExternalApiError, mapSupabaseError } from '../../lib/errors.js';
import { validateRequired, validateType, validateMethod, validateEnum } from '../../lib/validate.js';

const COUNTRY_TO_LOCATION = {
  'UK': 2826,    // United Kingdom
  'US': 2840,    // United States
  'UAE': 2784,   // United Arab Emirates
  'AU': 2036,    // Australia
  'SG': 2702,    // Singapore
  'HK': 2344     // Hong Kong
};

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
      
      const response = await fetchDataForSEO(kws.map(k => k.keyword_text), locationCode);
      
      if (response.error) {
        throw new ExternalApiError('DataForSEO', response.error);
      }

      // Process results and store metrics
      for (const result of response.results || []) {
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

/**
 * Fetch keyword data from DataForSEO
 */
async function fetchDataForSEO(keywords, locationCode) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new ValidationError('DataForSEO credentials not configured');
  }

  const auth = Buffer.from(`${login}:${password}`).toString('base64');

  const payload = [{
    keywords,
    location_code: locationCode,
    language_code: 'en'
  }];

  try {
    const response = await fetch(
      'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live',
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (data.status_code !== 20000) {
      return { error: data.status_message || 'API request failed' };
    }

    // Flatten results
    const results = data.tasks?.[0]?.result || [];
    return { results };

  } catch (err) {
    return { error: err.message };
  }
}
