-- Hoxton SEO Platform Database Schema
-- Run this in Supabase SQL Editor

-- =============================================
-- 1. PAGES TABLE
-- Store content structure from Excel
-- =============================================
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_name TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  cluster TEXT NOT NULL,
  level INTEGER DEFAULT 2,
  parent_page TEXT,
  sibling_links TEXT,
  cross_cluster_links TEXT,
  content_focus TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_pages_cluster ON pages(cluster);
CREATE INDEX IF NOT EXISTS idx_pages_level ON pages(level);

-- =============================================
-- 2. KEYWORDS TABLE
-- Keywords linked to pages
-- =============================================
CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_text TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UK',
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  cluster TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each keyword + country combo is unique
  UNIQUE(keyword_text, country)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_keywords_country ON keywords(country);
CREATE INDEX IF NOT EXISTS idx_keywords_cluster ON keywords(cluster);
CREATE INDEX IF NOT EXISTS idx_keywords_page_id ON keywords(page_id);

-- =============================================
-- 3. KEYWORD_METRICS TABLE
-- Historical metrics (new row each refresh)
-- =============================================
CREATE TABLE IF NOT EXISTS keyword_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  search_volume INTEGER DEFAULT 0,
  difficulty DECIMAL(5,2) DEFAULT 0,
  cpc DECIMAL(10,2) DEFAULT 0,
  competition DECIMAL(5,4) DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching latest metrics
CREATE INDEX IF NOT EXISTS idx_keyword_metrics_keyword_id ON keyword_metrics(keyword_id);
CREATE INDEX IF NOT EXISTS idx_keyword_metrics_fetched_at ON keyword_metrics(fetched_at DESC);

-- =============================================
-- 4. COMPETITORS TABLE
-- Competitor domains to track
-- =============================================
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. SERP_RANKINGS TABLE
-- SERP positions for keywords (historical)
-- =============================================
CREATE TABLE IF NOT EXISTS serp_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  position INTEGER,
  url TEXT,
  domain TEXT,
  title TEXT,
  is_hoxton BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for SERP queries
CREATE INDEX IF NOT EXISTS idx_serp_keyword_id ON serp_rankings(keyword_id);
CREATE INDEX IF NOT EXISTS idx_serp_is_hoxton ON serp_rankings(is_hoxton);
CREATE INDEX IF NOT EXISTS idx_serp_fetched_at ON serp_rankings(fetched_at DESC);

-- =============================================
-- 6. COMPETITOR_RANKINGS TABLE
-- Track competitor positions over time
-- =============================================
CREATE TABLE IF NOT EXISTS competitor_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  position INTEGER,
  url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for competitor tracking
CREATE INDEX IF NOT EXISTS idx_comp_rankings_keyword ON competitor_rankings(keyword_id);
CREATE INDEX IF NOT EXISTS idx_comp_rankings_competitor ON competitor_rankings(competitor_id);
CREATE INDEX IF NOT EXISTS idx_comp_rankings_fetched ON competitor_rankings(fetched_at DESC);

-- =============================================
-- HELPER FUNCTION: Auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to pages table
DROP TRIGGER IF EXISTS pages_updated_at ON pages;
CREATE TRIGGER pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Apply trigger to keywords table
DROP TRIGGER IF EXISTS keywords_updated_at ON keywords;
CREATE TRIGGER keywords_updated_at
  BEFORE UPDATE ON keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- USEFUL VIEW: Keywords with latest metrics
-- =============================================
CREATE OR REPLACE VIEW keywords_with_metrics AS
SELECT 
  k.*,
  m.search_volume,
  m.difficulty,
  m.cpc,
  m.competition,
  m.fetched_at as metrics_fetched_at
FROM keywords k
LEFT JOIN LATERAL (
  SELECT * FROM keyword_metrics 
  WHERE keyword_id = k.id 
  ORDER BY fetched_at DESC 
  LIMIT 1
) m ON true;

-- =============================================
-- USEFUL VIEW: Hoxton rankings summary
-- =============================================
CREATE OR REPLACE VIEW hoxton_rankings AS
SELECT 
  k.keyword_text,
  k.country,
  k.cluster,
  sr.position,
  sr.url,
  sr.fetched_at
FROM keywords k
INNER JOIN serp_rankings sr ON sr.keyword_id = k.id
WHERE sr.is_hoxton = true
ORDER BY k.country, sr.position;
