const BASE_URL = 'https://api.dataforseo.com';

/**
 * Get authorization header for DataForSEO API
 */
function getAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error('DataForSEO credentials not configured');
  }

  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
}

/**
 * Make a request to DataForSEO API
 * @param {string} endpoint - API endpoint path
 * @param {Array} data - Request payload
 * @returns {Promise<Array>} - API results
 */
export async function dataforseoRequest(endpoint, data) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (result.status_code !== 20000) {
    throw new Error(`DataForSEO error ${result.status_code}: ${result.status_message}`);
  }

  const task = result.tasks?.[0];
  if (task?.status_code !== 20000) {
    throw new Error(`Task error ${task.status_code}: ${task.status_message}`);
  }

  return task.result || [];
}

/**
 * Location codes for supported countries
 */
export const COUNTRY_TO_LOCATION = {
  'UK': 2826,
  'US': 2840,
  'UAE': 2784,
  'AU': 2036,
  'SG': 2702,
  'HK': 2344
};

/**
 * Get keyword search volume data
 * @param {string[]} keywords - Keywords to check
 * @param {number} locationCode - Country location code
 * @returns {Promise<Array>} - Keyword metrics
 */
export async function getKeywordMetrics(keywords, locationCode) {
  const data = [{
    keywords,
    location_code: locationCode,
    language_code: 'en'
  }];

  return dataforseoRequest(
    '/v3/keywords_data/google_ads/search_volume/live',
    data
  );
}

/**
 * Get SERP results for a keyword
 * @param {string} keyword - Keyword to check
 * @param {number} locationCode - Country location code
 * @param {number} depth - Number of results (default 100)
 * @returns {Promise<Array>} - SERP results
 */
export async function getSerpResults(keyword, locationCode, depth = 100) {
  const data = [{
    keyword,
    location_code: locationCode,
    language_code: 'en',
    depth
  }];

  const result = await dataforseoRequest(
    '/v3/serp/google/organic/live/regular',
    data
  );

  const items = result[0]?.items || [];

  return items
    .filter(item => item.type === 'organic')
    .map(item => ({
      rank_absolute: item.rank_absolute,
      url: item.url,
      domain: item.domain,
      title: item.title
    }));
}
