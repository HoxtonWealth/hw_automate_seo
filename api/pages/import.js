import { supabase } from '../../lib/supabase.js';
import { verifyApiKey } from '../../lib/auth.js';
import { success, error } from '../../lib/response.js';
import { UnauthorizedError, ValidationError, mapSupabaseError } from '../../lib/errors.js';
import { validateRequired, validateType, validateMethod } from '../../lib/validate.js';

/**
 * Import Pages Endpoint
 * POST /api/pages/import
 * 
 * Bulk import pages from Excel data
 * Body: { pages: [{ page_name, url, cluster, ... }, ...] }
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
    validateRequired(req.body, ['pages']);
    validateType(req.body.pages, 'pages', 'array');

    const { pages } = req.body;

    if (pages.length === 0) {
      throw new ValidationError('Pages array cannot be empty');
    }

    // Validate each page has required fields
    const requiredFields = ['page_name', 'url', 'cluster'];
    pages.forEach((page, index) => {
      requiredFields.forEach(field => {
        if (!page[field]) {
          throw new ValidationError(`Page at index ${index} missing required field: ${field}`);
        }
      });
    });

    // Prepare pages for insert
    const preparedPages = pages.map(page => ({
      page_name: page.page_name,
      url: page.url,
      cluster: page.cluster,
      level: page.level || 2,
      parent_page: page.parent_page || null,
      sibling_links: page.sibling_links || null,
      cross_cluster_links: page.cross_cluster_links || null,
      content_focus: page.content_focus || null
    }));

    // Insert pages (upsert to handle duplicates)
    const { data, error: dbError } = await supabase
      .from('pages')
      .upsert(preparedPages, { onConflict: 'url' })
      .select();

    if (dbError) {
      throw mapSupabaseError(dbError, 'upsert');
    }

    return success(res, data, { 
      count: data.length,
      message: `Successfully imported ${data.length} pages`
    });

  } catch (err) {
    return error(res, err);
  }
}
