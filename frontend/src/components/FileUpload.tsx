import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, File, Calendar, Scan, Printer } from 'lucide-react';
import { getCategories, Category } from '@/lib/api';
import { ScannerIntegration } from './Scanner/ScannerIntegration';
import { toast } from 'sonner';

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);

  // Generate years (current year and 10 years back)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i);

  // Generate months
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Generate dates (1-31)
  const dates = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      }
    };

    fetchCategories();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !category || !year || !month || !date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Prepare upload data
      const uploadData = {
        filename: file.name,
        fileContent: fileContent,
        category: category,
        year: year,
        month: month,
        date: date,
        description: description,
        mimetype: file.type,
        filesize: file.size
      };

      // Send to backend
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      toast.success('File uploaded successfully!');
      
      // Reset form
      setFile(null);
      setCategory('');
      setYear('');
      setMonth('');
      setDate('');
      setDescription('');
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scannedFile || !category || !year || !month || !date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsScanning(true);

    try {
      // Convert scanned file to base64
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(scannedFile);
      });

      // Prepare upload data
      const uploadData = {
        filename: scannedFile.name,
        fileContent: fileContent,
        category: category,
        year: year,
        month: month,
        date: date,
        description: description,
        mimetype: scannedFile.type,
        filesize: scannedFile.size
      };

      // Send to backend
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      toast.success('Scanned document uploaded successfully!');
      
      // Reset form
      setScannedFile(null);
      setCategory('');
      setYear('');
      setMonth('');
      setDate('');
      setDescription('');
      
    } catch (error) {
      console.error('Error uploading scanned file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload scanned file');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
            File Upload & Scanning
        </CardTitle>
        <CardDescription>
            Upload files or scan documents and organize them by category and date
        </CardDescription>
      </CardHeader>
      <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <File className="h-4 w-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="scan" className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Scan Document
              </TabsTrigger>
            </TabsList>

            {/* Upload File Tab */}
            <TabsContent value="upload" className="space-y-4">
              <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file-input">File</Label>
            <Input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              required
              className="cursor-pointer"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <File className="h-4 w-4" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={year} onValueChange={setYear} required>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={month} onValueChange={setMonth} required>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Select value={date} onValueChange={setDate} required>
                <SelectTrigger>
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  {dates.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex items-center justify-center h-10 px-3 text-sm text-muted-foreground bg-muted rounded-md">
                <Calendar className="h-4 w-4 mr-2" />
                {date && month && year ? `${date}/${month}/${year}` : 'Select date'}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter file description..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isUploading}>
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </>
            )}
          </Button>
        </form>
            </TabsContent>

            {/* Scan Document Tab */}
            <TabsContent value="scan" className="space-y-4">
              <ScannerIntegration
                onScanComplete={(file) => {
                  setScannedFile(file);
                  toast.success('Document scanned successfully!');
                }}
                onError={(error) => {
                  toast.error(error);
                }}
              />
              
              {scannedFile && (
                <form onSubmit={handleScanSubmit} className="space-y-4">
                  {/* Scanned File Info */}
                  <div className="space-y-2">
                    <Label>Scanned Document</Label>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border rounded-lg">
                      <File className="h-4 w-4" />
                      {scannedFile.name} ({(scannedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="scan-category">Category</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Selection */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scan-year">Year</Label>
                      <Select value={year} onValueChange={setYear} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scan-month">Month</Label>
                      <Select value={month} onValueChange={setMonth} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scan-date">Date</Label>
                      <Select value={date} onValueChange={setDate} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Date" />
                        </SelectTrigger>
                        <SelectContent>
                          {dates.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>&nbsp;</Label>
                      <div className="flex items-center justify-center h-10 px-3 text-sm text-muted-foreground bg-muted rounded-md">
                        <Calendar className="h-4 w-4 mr-2" />
                        {date && month && year ? `${date}/${month}/${year}` : 'Select date'}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="scan-description">Description (Optional)</Label>
                    <Textarea
                      id="scan-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter document description..."
                      rows={3}
                    />
                  </div>

                  {/* Submit Button */}
                  <Button type="submit" className="w-full" disabled={isScanning}>
                    {isScanning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Uploading Scanned Document...
                      </>
                    ) : (
                      <>
                        <Printer className="h-4 w-4 mr-2" />
                        Upload Scanned Document
                      </>
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
      </CardContent>
    </Card>
    </div>
  );
};

export default FileUpload; 