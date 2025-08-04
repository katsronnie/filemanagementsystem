import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Folder, 
  File, 
  Calendar, 
  Download, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  Eye
} from 'lucide-react';
import { 
  getFileStructure, 
  getFilesByDate, 
  deleteFile, 
  FileData, 
  FileStructure 
} from '@/lib/api';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const FileBrowser: React.FC = () => {
  const [structure, setStructure] = useState<FileStructure>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStructure();
  }, []);

  useEffect(() => {
    if (selectedCategory && selectedYear && selectedMonth && selectedDate) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [selectedCategory, selectedYear, selectedMonth, selectedDate]);

  const fetchStructure = async () => {
    try {
      setLoading(true);
      const data = await getFileStructure();
      setStructure(data);
    } catch (error) {
      console.error('Error fetching structure:', error);
      toast.error('Failed to load file structure');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    if (!selectedCategory || !selectedYear || !selectedMonth || !selectedDate) return;
    
    try {
      setLoading(true);
      const data = await getFilesByDate(selectedCategory, selectedYear, selectedMonth, selectedDate);
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: number, filename: string) => {
    try {
      await deleteFile(fileId);
      toast.success(`File "${filename}" deleted successfully`);
      fetchFiles(); // Refresh the file list
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleDownloadFile = (file: FileData) => {
    try {
      // If the file has a publicUrl, use it directly
      if ('publicUrl' in file && file.publicUrl) {
        window.open(file.publicUrl as string, '_blank');
        return;
      }
      
      // Fallback: construct the URL from the filepath
      const supabaseUrl = 'https://dosjuatlsvfwyqftniad.supabase.co';
      const storageUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${file.filepath}`;
      window.open(storageUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleViewFile = (file: FileData) => {
    try {
      // For PDFs and images, open in new tab
      if (file.mimetype?.includes('pdf') || file.mimetype?.includes('image')) {
        if ('publicUrl' in file && file.publicUrl) {
          window.open(file.publicUrl as string, '_blank');
        } else {
          const supabaseUrl = 'https://dosjuatlsvfwyqftniad.supabase.co';
          const storageUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${file.filepath}`;
          window.open(storageUrl, '_blank');
        }
      } else {
        // For other file types, trigger download
        handleDownloadFile(file);
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Failed to view file');
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleYear = (year: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const toggleMonth = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMonthName = (month: string) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(month) - 1];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* File Structure Tree */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              File Structure
            </CardTitle>
            <CardDescription>
              Navigate through categories and dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(structure).map(([category, years]) => (
                  <div key={category} className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-auto p-2"
                      onClick={() => toggleCategory(category)}
                    >
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="h-4 w-4 mr-2" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2" />
                      )}
                      <Folder className="h-4 w-4 mr-2" />
                      <span className="capitalize">{category}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {Object.keys(years).length}
                      </Badge>
                    </Button>
                    
                    {expandedCategories.has(category) && (
                      <div className="ml-6 space-y-1">
                        {Object.entries(years).map(([year, months]) => (
                          <div key={year} className="space-y-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start h-auto p-2"
                              onClick={() => toggleYear(year)}
                            >
                              {expandedYears.has(year) ? (
                                <ChevronDown className="h-4 w-4 mr-2" />
                              ) : (
                                <ChevronRight className="h-4 w-4 mr-2" />
                              )}
                              <Calendar className="h-4 w-4 mr-2" />
                              {year}
                              <Badge variant="outline" className="ml-auto">
                                {Object.keys(months).length}
                              </Badge>
                            </Button>
                            
                            {expandedYears.has(year) && (
                              <div className="ml-6 space-y-1">
                                {Object.entries(months).map(([month, dates]) => (
                                  <div key={month} className="space-y-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start h-auto p-2"
                                      onClick={() => toggleMonth(month)}
                                    >
                                      {expandedMonths.has(month) ? (
                                        <ChevronDown className="h-4 w-4 mr-2" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 mr-2" />
                                      )}
                                      {getMonthName(month)}
                                      <Badge variant="outline" className="ml-auto">
                                        {dates.length}
                                      </Badge>
                                    </Button>
                                    
                                    {expandedMonths.has(month) && (
                                      <div className="ml-6 space-y-1">
                                        {dates.map((date) => (
                                          <Button
                                            key={date}
                                            variant={
                                              selectedCategory === category &&
                                              selectedYear === year &&
                                              selectedMonth === month &&
                                              selectedDate === date
                                                ? "default"
                                                : "ghost"
                                            }
                                            size="sm"
                                            className="w-full justify-start h-auto p-2"
                                            onClick={() => {
                                              setSelectedCategory(category);
                                              setSelectedYear(year);
                                              setSelectedMonth(month);
                                              setSelectedDate(date);
                                            }}
                                          >
                                            {date}
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* File List */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              Files
            </CardTitle>
            <CardDescription>
              {selectedCategory && selectedYear && selectedMonth && selectedDate
                ? `Files for ${selectedCategory} - ${selectedDate}/${selectedMonth}/${selectedYear}`
                : 'Select a date to view files'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedCategory || !selectedYear || !selectedMonth || !selectedDate ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a date from the file structure to view files</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No files found for this date</p>
              </div>
            ) : (
              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <File className="h-8 w-8 text-blue-500" />
                      <div>
                        <h4 className="font-medium">{file.filename}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{formatFileSize(file.filesize)}</span>
                          <span>{file.mimetype}</span>
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                        {file.description && (
                          <p className="text-sm text-muted-foreground mt-1">{file.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewFile(file)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadFile(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete File</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{file.filename}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFile(file.id, file.filename)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FileBrowser; 