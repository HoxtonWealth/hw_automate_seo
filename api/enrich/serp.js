import { supabase } from '../../lib/supabase.js';
import { verifyApiKey } from '../../lib/auth.js';
import { success, error } from '../../lib/response.js';
import { UnauthorizedError, ValidationError, ExternalApiError, mapSupabaseError } from '../../lib/errors.js';
import { validateRequired, validateType, validateMethod } from '../../lib/validate.js';
import { getSerpResults, COUNTRY_TO_LOCATION } from '../../lib/dataforseo.js';

const HOXTON_DOMAIN = 'hoxtonwealth.com';

/**
 * Enrich SERP Endpoint
 * POST /api/enrich/serp
 * 
 * Fetch SERP rankings from DataForSEO and store in database
 * Body: { keyword_ids: ['uuid1', 'uuid2', ...] }
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
    validateRequired(req.body, ['keyword_ids']);
    validateType(req.body.keyword_ids, 'keyword_ids', 'array');

    const { keyword_ids } = req.body;

    if (keyword_ids.length === 0) {
      throw new ValidationError('keyword_ids array cannot be empty');
    }

    if (keyword_ids.length > 50) {
      throw new ValidationError('Maximum 50 keywords per SERP request', {
        received: keyword_ids.length,
        maximum: 50
      });
    }

    // Fetch keywords from database
    const { data: keywords, error: dbError } = await supabase
      .from('keywords')
      .select('id, keyword_text, country')
      .in('id', keyword_ids);

    if (dbError) {
      throw mapSupabaseError(dbError, 'select');
    }

    if (keywords.length === 0) {
      throw new ValidationError('No keywords found with provided IDs');
    }

    // Fetch competitors for tracking
    const { data: competitors } = await supabase
      .from('competitors')
      .select('id, domain');

    const competitorDomains = new Map(
      (competitors || []).map(c => [c.domain, c.id])
    );

    // Process each keyword
    const results = [];
    const serpRecords = [];
    const competitorRecords = [];

    for (const keyword of keywords) {
      const locationCode = COUNTRY_TO_LOCATION[keyword.country] || 2826;

      try {
        const items = await getSerpResults(keyword.keyword_text, locationCode);

        // Process top 100 results
        for (const item of items) {
        const domain = extractDomain(item.url);
        const isHoxton = domain.includes(HOXTON_DOMAIN);

        // Store SERP ranking
        serpRecords.push({
          keyword_id: keyword.id,
          position: item.rank_absolute,
          url: item.url,
          domain,
          title: item.title,
          is_hoxton: isHoxton
        });

        // If competitor, track separately
        const competitorId = competitorDomains.get(domain);
        if (competitorId) {
          competitorRecords.push({
            keyword_id: keyword.id,
            competitor_id: competitorId,
            position: item.rank_absolute,
            url: item.url
          });
        }
      }

        results.push({
          keyword: keyword.keyword_text,
          country: keyword.country,
          results_count: items.length,
          hoxton_position: items.find(i =>
            extractDomain(i.url).includes(HOXTON_DOMAIN)
          )?.rank_absolute || null
        });
      } catch (err) {
        results.push({
          keyword: keyword.keyword_text,
          error: err.message
        });
      }
    }

    // Batch insert SERP records
    if (serpRecords.length > 0) {
      const { error: serpError } = await supabase
        .from('serp_rankings')
        .insert(serpRecords);

      if (serpError) {
        console.error('Failed to insert SERP records:', serpError);
      }
    }

    // Batch insert competitor records
    if (competitorRecords.length > 0) {
      const { error: compError } = await supabase
        .from('competitor_rankings')
        .insert(competitorRecords);

      if (compError) {
        console.error('Failed to insert competitor records:', compError);
      }
    }

    return success(res, results, {
      keywords_processed: results.length,
      serp_records: serpRecords.length,
      competitor_records: competitorRecords.length
    });

  } catch (err) {
    return error(res, err);
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
