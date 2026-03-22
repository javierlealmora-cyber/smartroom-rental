// Script para exportar esquema de BBDD sin Docker
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://lqwyyyttjamirccdtlvl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxxd3l5eXR0amFtaXJjY2R0bHZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTU2NzQ3NCwiZXhwIjoyMDUxMTQzNDc0fQ.FvVYBqhEYvVqVvVqVqVqVqVqVqVqVqVqVqVqVqVqVqU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTables() {
  const { data, error } = await supabase.rpc('get_tables_info');
  if (error) console.error('Error:', error);
  else console.log('Tables:', data);
}

getTables();
