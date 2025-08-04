const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit here
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Routes

// Get categories
app.get('/api/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    res.json(categories || []);
  } catch (error) {
    console.error('Error in /api/categories:', error);
    res.status(500).json({ error: 'Internal server error' });
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

// Upload file to Supabase Storage
app.post('/api/upload', async (req, res) => {
  try {
    const { category, year, month, date, description, filename, fileContent, mimetype, filesize } = req.body;
    
    if (!filename || !fileContent || !category || !year || !month || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 file content back to buffer
    const fileBuffer = Buffer.from(fileContent, 'base64');
    
    // Create file path in Supabase Storage
    const filePath = `${category}/${year}/${month}/${date}/${filename}`;
    
    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, fileBuffer, {
        contentType: mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    // Save file metadata to database
    const { data: dbData, error: dbError } = await supabase
      .from('files')
      .insert([
        {
          filename: filename,
          filepath: filePath,
          category: category,
          year: year,
          month: month,
          date: date,
          description: description,
          filesize: filesize,
          mimetype: mimetype
        }
      ])
      .select();
    
    if (dbError) throw dbError;
    
    res.json({
      message: 'File uploaded successfully',
      file: {
        ...dbData[0],
        publicUrl: urlData.publicUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
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
    
    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('uploads')
      .remove([fileData.filepath]);
    
    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue with database deletion even if storage deletion fails
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Dashboard Statistics Endpoints

// Get total file count
app.get('/api/stats/files/total', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('files')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    res.json({ totalFiles: count || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get files by category for dashboard
app.get('/api/stats/files/by-category', async (req, res) => {
  try {
    // First get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('name')
      .order('name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    // Then get file counts for each category
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('category');

    if (filesError) {
      console.error('Error fetching files:', filesError);
      return res.status(500).json({ error: 'Failed to fetch files' });
    }

    // Count files per category
    const categoryCounts = {};
    categories.forEach(cat => {
      categoryCounts[cat.name] = 0;
    });

    files.forEach(file => {
      if (categoryCounts.hasOwnProperty(file.category)) {
        categoryCounts[file.category]++;
      }
    });

    res.json(categoryCounts);
  } catch (error) {
    console.error('Error in /api/stats/files/by-category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent file uploads (last 7 days)
app.get('/api/stats/files/recent', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users who logged in today
app.get('/api/stats/users/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) throw error;
    
    // Filter users who logged in today
    const todayUsers = data.users.filter(user => {
      if (!user.last_sign_in_at) return false;
      const lastSignIn = new Date(user.last_sign_in_at);
      return lastSignIn >= today;
    });
    
    // Return user details (without sensitive info)
    const userDetails = todayUsers.map(user => ({
      id: user.id,
      email: user.email,
      last_sign_in_at: user.last_sign_in_at,
      created_at: user.created_at
    }));
    
    res.json({
      count: todayUsers.length,
      users: userDetails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get total user count
app.get('/api/stats/users/total', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) throw error;
    
    res.json({ totalUsers: data.users.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get storage usage statistics
app.get('/api/stats/storage', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('filesize');
    
    if (error) throw error;
    
    const totalSize = data.reduce((sum, file) => sum + (file.filesize || 0), 0);
    const averageSize = data.length > 0 ? totalSize / data.length : 0;
    
    res.json({
      totalSize,
      averageSize,
      fileCount: data.length
    });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 