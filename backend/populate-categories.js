const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const defaultCategories = [
  { name: 'neonatal', description: 'Neonatal care and treatment files' },
  { name: 'pediatric', description: 'Pediatric care and treatment files' },
  { name: 'emergency', description: 'Emergency room files' },
  { name: 'surgery', description: 'Surgical procedure files' },
  { name: 'laboratory', description: 'Laboratory test results' },
  { name: 'radiology', description: 'Radiology and imaging files' },
  { name: 'pharmacy', description: 'Pharmacy and medication files' },
  { name: 'administration', description: 'Administrative and billing files' }
];

async function populateCategories() {
  try {
    console.log('Checking existing categories...');
    
    // First, check what categories already exist
    const { data: existingCategories, error: fetchError } = await supabase
      .from('categories')
      .select('name');
    
    if (fetchError) {
      console.error('Error fetching existing categories:', fetchError);
      return;
    }
    
    const existingNames = existingCategories.map(cat => cat.name);
    console.log('Existing categories:', existingNames);
    
    // Filter out categories that already exist
    const categoriesToInsert = defaultCategories.filter(cat => 
      !existingNames.includes(cat.name)
    );
    
    if (categoriesToInsert.length === 0) {
      console.log('All categories already exist!');
      return;
    }
    
    console.log('Inserting categories:', categoriesToInsert.map(cat => cat.name));
    
    // Insert missing categories
    const { data: insertedCategories, error: insertError } = await supabase
      .from('categories')
      .insert(categoriesToInsert)
      .select();
    
    if (insertError) {
      console.error('Error inserting categories:', insertError);
      return;
    }
    
    console.log('Successfully inserted categories:', insertedCategories);
    
    // Verify all categories are now present
    const { data: allCategories, error: verifyError } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (verifyError) {
      console.error('Error verifying categories:', verifyError);
      return;
    }
    
    console.log('All categories in database:', allCategories);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

populateCategories(); 