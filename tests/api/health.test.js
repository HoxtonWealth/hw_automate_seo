import handler from '../../api/health.js';
import { createMocks } from 'node-mocks-http';

describe('GET /api/health', () => {
  test('returns 200 and success message', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toContain('running');
  });
});
