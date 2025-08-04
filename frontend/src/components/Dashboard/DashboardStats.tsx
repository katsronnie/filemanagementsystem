import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Folder, Upload, Users, Calendar, Clock } from "lucide-react";
import { getDashboardStats, TodayUser } from "@/lib/api";
import { toast } from "sonner";

interface DashboardStatsProps {
  userRole: 'admin' | 'category';
  allowedCategories: string[];
}

const CATEGORY_LABELS: { [key: string]: string } = {
  'neonatal': 'Neonatal Care',
  'pediatric': 'Pediatrics',
  'emergency': 'Emergency',
  'surgery': 'Surgery',
  'laboratory': 'Laboratory',
  'radiology': 'Radiology',
  'pharmacy': 'Pharmacy',
  'administration': 'Administration'
};

export const DashboardStats = ({ userRole, allowedCategories }: DashboardStatsProps) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todayUsers, setTodayUsers] = useState<TodayUser[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
      setTodayUsers(data.recentFiles || []); // This will be updated when we fix the API
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
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

  const isAdmin = userRole === 'admin';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load dashboard statistics</p>
        <Button onClick={fetchStats} className="mt-4">Retry</Button>
      </div>
    );
  }

  // Update userCategoryFiles calculation to use stats.categoryCounts
  const userCategoryFiles = Object.entries(stats.categoryCounts || {}).map(([category, count]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    count: count as number
  }));



  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {isAdmin ? stats.totalFiles.toLocaleString() : userCategoryFiles.reduce((sum, cat) => sum + cat.count, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Across all categories' : 'In your categories'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isAdmin ? Object.keys(stats.categoryCounts).length : allowedCategories.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Total medical categories' : 'Accessible to you'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(stats.storageUsage.totalSize)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.storageUsage.fileCount} files
            </p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Dialog>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                  <div className="text-2xl font-bold">{stats.todayUsers}</div>
              <p className="text-xs text-muted-foreground">
                    Click to view details
              </p>
            </CardContent>
          </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Users Who Logged In Today</DialogTitle>
                <DialogDescription>
                  List of users who have logged in today ({stats.todayUsers} users)
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Last Sign In</TableHead>
                      <TableHead>Account Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.todayUsersList && stats.todayUsersList.length > 0 ? (
                      stats.todayUsersList.map((user: TodayUser) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No users logged in today
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userCategoryFiles.map(({ category, count }) => {
              const categoryKey = category.toLowerCase();
              const categoryLabel = CATEGORY_LABELS[categoryKey] || category;
              
              return (
                <div key={categoryKey} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{categoryLabel}</p>
                    <p className="text-sm text-muted-foreground">{categoryKey}</p>
                  </div>
                  <Badge variant="secondary">
                    {count} files
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent File Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentFiles.length > 0 ? (
              stats.recentFiles.map((file: any, index: number) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <div>
                      <p className="text-sm font-medium">{file.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.filesize)}</p>
                    </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[file.category as keyof typeof CATEGORY_LABELS] || file.category}
                  </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(file.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent file uploads</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};