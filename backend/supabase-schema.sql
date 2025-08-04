-- Create categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  filepath TEXT NOT NULL,
  category VARCHAR(255) NOT NULL,
  year VARCHAR(4) NOT NULL,
  month VARCHAR(2) NOT NULL,
  date VARCHAR(2) NOT NULL,
  description TEXT,
  filesize BIGINT,
  mimetype VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_files_category ON files(category);
CREATE INDEX idx_files_year ON files(year);
CREATE INDEX idx_files_month ON files(month);
CREATE INDEX idx_files_date ON files(date);
CREATE INDEX idx_files_created_at ON files(created_at);

-- Insert some default categories
INSERT INTO categories (name, description) VALUES
  ('neonatal', 'Neonatal care and treatment files'),
  ('pediatric', 'Pediatric care and treatment files'),
  ('emergency', 'Emergency room files'),
  ('surgery', 'Surgical procedure files'),
  ('laboratory', 'Laboratory test results'),
  ('radiology', 'Radiology and imaging files'),
  ('pharmacy', 'Pharmacy and medication files'),
  ('administration', 'Administrative and billing files');

-- Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policies for categories table
CREATE POLICY "Allow public read access to categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert categories" ON categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update categories" ON categories
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policies for files table
CREATE POLICY "Allow public read access to files" ON files
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert files" ON files
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update files" ON files
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete files" ON files
  FOR DELETE USING (auth.role() = 'authenticated'); 