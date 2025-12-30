# Hoxton SEO Platform

Track and optimize SEO performance for Hoxton Wealth's retirement planning content.

## Quick Start

### 1. Set Up Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Go to **SQL Editor**
4. Copy the contents of `migrations/001_initial_schema.sql`
5. Paste and run it

### 2. Deploy to Vercel

1. Push this code to GitHub (instructions below)
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New → Project**
4. Import `hw_automate_seo` repository
5. Add environment variables (see below)
6. Deploy!

### 3. Add Environment Variables in Vercel

In your Vercel project settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase anon/public key |
| `API_KEY` | A secret key you create (e.g., `hw-seo-abc123xyz`) |
| `DATAFORSEO_LOGIN` | Your DataForSEO login |
| `DATAFORSEO_PASSWORD` | Your DataForSEO password |

**Where to find Supabase credentials:**
- Go to Supabase → Project Settings → API
- Copy the URL and anon key

## API Endpoints

All endpoints (except /health) require `x-api-key` header.

### Health Check
```bash
GET /api/health
```

### Pages
```bash
# List all pages
GET /api/pages

# List pages by cluster
GET /api/pages?cluster=Tools

# Add single page
POST /api/pages
{
  "page_name": "Retirement Calculator",
  "url": "/tools/retirement-calculator",
  "cluster": "Tools"
}

# Bulk import pages
POST /api/pages/import
{
  "pages": [
    { "page_name": "...", "url": "...", "cluster": "..." },
    ...
  ]
}
```

### Keywords
```bash
# List all keywords
GET /api/keywords

# Filter by country
GET /api/keywords?country=UK

# Filter by cluster
GET /api/keywords?cluster=Tools

# Add keywords in bulk
POST /api/keywords/batch
{
  "keywords": ["retirement planning", "pension advice", ...],
  "country": "UK",
  "cluster": "Strategy"  // optional
}
```

### Competitors
```bash
# List competitors
GET /api/competitors

# Add competitor
POST /api/competitors
{
  "domain": "moneysupermarket.com",
  "name": "MoneySupermarket",
  "notes": "UK comparison site"
}
```

### Enrich Data (DataForSEO)
```bash
# Fetch keyword metrics
POST /api/enrich/keywords
{
  "keyword_ids": ["uuid1", "uuid2", ...]
}

# Fetch SERP rankings
POST /api/enrich/serp
{
  "keyword_ids": ["uuid1", "uuid2", ...]
}
```

## Testing Your API

Once deployed, test with:

```bash
# Health check (no auth needed)
curl https://your-project.vercel.app/api/health

# List pages (with auth)
curl https://your-project.vercel.app/api/pages \
  -H "x-api-key: your-api-key"

# Add keywords
curl -X POST https://your-project.vercel.app/api/keywords/batch \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"keywords": ["retirement planning"], "country": "UK"}'
```

## Project Structure

```
hoxton-seo-platform/
├── api/                    # Vercel serverless functions
│   ├── health.js          # GET /api/health
│   ├── pages/
│   │   ├── index.js       # GET/POST /api/pages
│   │   └── import.js      # POST /api/pages/import
│   ├── keywords/
│   │   ├── index.js       # GET /api/keywords
│   │   └── batch.js       # POST /api/keywords/batch
│   ├── competitors/
│   │   └── index.js       # GET/POST /api/competitors
│   └── enrich/
│       ├── keywords.js    # POST /api/enrich/keywords
│       └── serp.js        # POST /api/enrich/serp
├── lib/                    # Shared utilities
│   ├── supabase.js        # Database client
│   ├── auth.js            # API key verification
│   ├── response.js        # Standard responses
│   ├── errors.js          # Error classes
│   └── validate.js        # Input validation
├── migrations/
│   └── 001_initial_schema.sql
├── vercel.json
├── package.json
└── README.md
```

## Countries Supported

- UK (United Kingdom)
- US (United States)
- UAE (United Arab Emirates)
- AU (Australia)
- SG (Singapore)
- HK (Hong Kong)
