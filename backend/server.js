const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { category, year, month, date } = req.body;
    const uploadPath = path.join(__dirname, 'uploads', category, year, month, date);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get files by category and date
app.get('/api/files/:category/:year/:month/:date', async (req, res) => {
  try {
    const { category, year, month, date } = req.params;
    
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('category', category)
      .eq('year', year)
      .eq('month', month)
      .eq('date', date)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { category, year, month, date, description } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Save file info to Supabase
    const { data, error } = await supabase
      .from('files')
      .insert([
        {
          filename: file.originalname,
          filepath: file.path,
          category: category,
          year: year,
          month: month,
          date: date,
          description: description,
          filesize: file.size,
          mimetype: file.mimetype
        }
      ])
      .select();
    
    if (error) throw error;
    
    res.json({
      message: 'File uploaded successfully',
      file: data[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get file structure (categories with years/months/dates)
app.get('/api/structure', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('category, year, month, date')
      .order('category')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    // Organize data into hierarchical structure
    const structure = {};
    data.forEach(file => {
      if (!structure[file.category]) {
        structure[file.category] = {};
      }
      if (!structure[file.category][file.year]) {
        structure[file.category][file.year] = {};
      }
      if (!structure[file.category][file.year][file.month]) {
        structure[file.category][file.year][file.month] = [];
      }
      if (!structure[file.category][file.year][file.month].includes(file.date)) {
        structure[file.category][file.year][file.month].push(file.date);
      }
    });
    
    res.json(structure);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file
app.delete('/api/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get file info first
    const { data: fileData, error: fetchError } = await supabase
      .from('files')
      .select('filepath')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    // Delete physical file
    if (fs.existsSync(fileData.filepath)) {
      fs.unlinkSync(fileData.filepath);
    }
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin User Management Endpoints

// Middleware to check if user is admin (you can enhance this later)
const isAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Check if user is admin (you can add a role field to your users table)
    // For now, we'll allow any authenticated user to access admin functions
    // You should implement proper role checking based on your needs
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Get all users (admin only)
app.get('/api/admin/users', isAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) throw error;
    
    // Filter out sensitive information
    const users = data.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at
    }));
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new user (admin only)
app.post('/api/admin/users', isAdmin, async (req, res) => {
  try {
    const { email, password, user_metadata } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: user_metadata || {}
    });
    
    if (error) throw error;
    
    res.json({
      message: 'User created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:userId', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) throw error;
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (admin only)
app.put('/api/admin/users/:userId', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, password, user_metadata } = req.body;
    
    const updateData = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (user_metadata) updateData.user_metadata = user_metadata;
    
    const { data, error } = await supabase.auth.admin.updateUserById(userId, updateData);
    
    if (error) throw error;
    
    res.json({
      message: 'User updated successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        updated_at: data.user.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 