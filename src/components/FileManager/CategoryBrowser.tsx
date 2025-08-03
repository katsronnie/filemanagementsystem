import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Folder, FolderOpen, File, Calendar, Search, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  uploadDate: Date;
  category: string;
  path: string;
}

interface CategoryBrowserProps {
  allowedCategories: string[];
  onFileSelect: (file: FileItem) => void;
}

const SAMPLE_FILES: FileItem[] = [
  {
    id: '1',
    name: 'patient_report_001.pdf',
    type: 'file',
    size: 2048000,
    uploadDate: new Date('2024-01-15'),
    category: 'gyn',
    path: '/gyn/2024/01/15'
  },
  {
    id: '2',
    name: 'lab_results_patient_002.pdf',
    type: 'file',
    size: 1024000,
    uploadDate: new Date('2024-01-15'),
    category: 'oncology',
    path: '/oncology/2024/01/15'
  },
  {
    id: '3',
    name: 'prescription_form.jpg',
    type: 'file',
    size: 512000,
    uploadDate: new Date('2024-01-14'),
    category: 'pharmacy',
    path: '/pharmacy/2024/01/14'
  },
  {
    id: '4',
    name: 'therapy_notes.docx',
    type: 'file',
    size: 256000,
    uploadDate: new Date('2024-01-14'),
    category: 'therapy',
    path: '/therapy/2024/01/14'
  },
  {
    id: '5',
    name: 'pediatric_checkup.pdf',
    type: 'file',
    size: 1536000,
    uploadDate: new Date('2024-01-13'),
    category: 'paed',
    path: '/paed/2024/01/13'
  }
];

const MEDICAL_CATEGORIES = [
  { value: 'paed', label: 'Pediatrics', color: 'bg-blue-100 text-blue-800' },
  { value: 'gyn', label: 'Gynecology', color: 'bg-pink-100 text-pink-800' },
  { value: 'oncology', label: 'Oncology', color: 'bg-purple-100 text-purple-800' },
  { value: 'pharmacy', label: 'Pharmacy', color: 'bg-green-100 text-green-800' },
  { value: 'therapy', label: 'Therapy', color: 'bg-orange-100 text-orange-800' },
  { value: 'neonato', label: 'Neonatology', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'postnato', label: 'Postnatal', color: 'bg-teal-100 text-teal-800' },
  { value: 'matano', label: 'Maternity', color: 'bg-rose-100 text-rose-800' },
  { value: 'mautury', label: 'Maturity', color: 'bg-indigo-100 text-indigo-800' }
];

export const CategoryBrowser = ({ allowedCategories, onFileSelect }: CategoryBrowserProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  const filteredFiles = SAMPLE_FILES.filter(file => {
    const matchesCategory = selectedCategory === "all" || file.category === selectedCategory;
    const matchesAccess = allowedCategories.includes(file.category);
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesAccess && matchesSearch;
  });

  const availableCategories = MEDICAL_CATEGORIES.filter(cat => 
    allowedCategories.includes(cat.value)
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryInfo = (categoryValue: string) => {
    return MEDICAL_CATEGORIES.find(cat => cat.value === categoryValue);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Folder className="h-5 w-5" />
          <span>File Browser</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {availableCategories.map(category => {
            const fileCount = SAMPLE_FILES.filter(f => f.category === category.value).length;
            return (
              <Button
                key={category.value}
                className="h-auto p-3 flex flex-col items-center space-y-1"
                onClick={() => setSelectedCategory(category.value)}
              >
                <FolderOpen className="h-4 w-4" />
                <span className="text-xs font-medium">{category.label}</span>
                <Badge className="text-xs">
                  {fileCount} files
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* File List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              Files ({filteredFiles.length})
            </h3>
            {searchTerm && (
              <Badge>
                Search: "{searchTerm}"
              </Badge>
            )}
          </div>
          
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No files found</p>
              </div>
            ) : (
              filteredFiles.map(file => {
                const categoryInfo = getCategoryInfo(file.category);
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={cn("text-xs", categoryInfo?.color)}>
                            {categoryInfo?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size || 0)}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {file.uploadDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                        <Button
                        className="variant-ghost"
                        onClick={() => onFileSelect(file)}
                        >
                        <Eye className="h-4 w-4" />
                        </Button>
                      <Button
                        className="variant-ghost"
                        onClick={() => onFileSelect(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};