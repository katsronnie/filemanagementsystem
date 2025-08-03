import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Folder, Upload, Users } from "lucide-react";

interface DashboardStatsProps {
  userRole: 'admin' | 'category';
  allowedCategories: string[];
}

const SAMPLE_STATS = {
  totalFiles: 1247,
  totalCategories: 9,
  todayUploads: 23,
  activeUsers: 12,
  categoryStats: {
    paed: 156,
    gyn: 203,
    oncology: 189,
    pharmacy: 145,
    therapy: 98,
    neonato: 67,
    postnato: 134,
    matano: 178,
    mautury: 77
  }
};

const CATEGORY_LABELS = {
  paed: 'Pediatrics',
  gyn: 'Gynecology',
  oncology: 'Oncology',
  pharmacy: 'Pharmacy',
  therapy: 'Therapy',
  neonato: 'Neonatology',
  postnato: 'Postnatal',
  matano: 'Maternity',
  mautury: 'Maturity'
};

export const DashboardStats = ({ userRole, allowedCategories }: DashboardStatsProps) => {
  const userCategoryFiles = allowedCategories.reduce((total, cat) => {
    return total + (SAMPLE_STATS.categoryStats[cat as keyof typeof SAMPLE_STATS.categoryStats] || 0);
  }, 0);

  const isAdmin = userRole === 'admin';

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
              {isAdmin ? SAMPLE_STATS.totalFiles.toLocaleString() : userCategoryFiles.toLocaleString()}
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
              {isAdmin ? SAMPLE_STATS.totalCategories : allowedCategories.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Total medical categories' : 'Accessible to you'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Uploads</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{SAMPLE_STATS.todayUploads}</div>
            <p className="text-xs text-muted-foreground">
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{SAMPLE_STATS.activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                Logged in today
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isAdmin ? Object.keys(SAMPLE_STATS.categoryStats) : allowedCategories).map(categoryKey => {
              const fileCount = SAMPLE_STATS.categoryStats[categoryKey as keyof typeof SAMPLE_STATS.categoryStats];
              const categoryLabel = CATEGORY_LABELS[categoryKey as keyof typeof CATEGORY_LABELS];
              
              return (
                <div key={categoryKey} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{categoryLabel}</p>
                    <p className="text-sm text-muted-foreground">{categoryKey}</p>
                  </div>
                  <Badge variant="secondary">
                    {fileCount} files
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
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'File uploaded', file: 'patient_report_new.pdf', category: 'gyn', time: '2 minutes ago' },
              { action: 'File uploaded', file: 'lab_results_urgent.pdf', category: 'oncology', time: '15 minutes ago' },
              { action: 'File accessed', file: 'prescription_form.jpg', category: 'pharmacy', time: '1 hour ago' },
              { action: 'File uploaded', file: 'therapy_session_notes.docx', category: 'therapy', time: '2 hours ago' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-primary rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.file}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[activity.category as keyof typeof CATEGORY_LABELS]}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};