CREATE TABLE IF NOT EXISTS alumni_system.top_scholars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  exam_year INTEGER NOT NULL,
  rank_description VARCHAR(200) NOT NULL,
  university VARCHAR(200),
  major VARCHAR(100),
  score INTEGER,
  photo_url VARCHAR(500),
  biography TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_top_scholars_exam_year ON alumni_system.top_scholars(exam_year);
CREATE INDEX IF NOT EXISTS idx_top_scholars_sort_order ON alumni_system.top_scholars(sort_order DESC);
