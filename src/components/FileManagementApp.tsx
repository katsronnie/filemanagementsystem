import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Header } from "./Layout/Header";
import { LoginForm } from "./Auth/LoginForm";
import { DashboardStats } from "./Dashboard/DashboardStats";
import { UploadZone } from "./FileUpload/UploadZone";
import { CategoryBrowser } from "./FileManager/CategoryBrowser";

interface User {
  email: string;
  role: 'admin' | 'category';
  name: string;
  allowedCategories: string[];
}

// Demo users for the mockup
const DEMO_USERS: Record<string, User> = {
  'admin@medfile.com': {
    email: 'admin@medfile.com',
    role: 'admin',
    name: 'Dr. Sarah Admin',
    allowedCategories: ['paed', 'gyn', 'oncology', 'pharmacy', 'therapy', 'neonato', 'postnato', 'matano', 'mautury']
  },
  'gyn@medfile.com': {
    email: 'gyn@medfile.com',
    role: 'category',
    name: 'Dr. Emma Wilson',
    allowedCategories: ['gyn']
  },
  'oncology@medfile.com': {
    email: 'oncology@medfile.com',
    role: 'category',
    name: 'Dr. Michael Chen',
    allowedCategories: ['oncology']
  },
  'paed@medfile.com': {
    email: 'paed@medfile.com',
    role: 'category',
    name: 'Dr. Lisa Johnson',
    allowedCategories: ['paed', 'neonato']
  }
};

export const FileManagementApp = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();

  const handleLogin = (email: string, password: string) => {
    // Demo login logic
    const user = DEMO_USERS[email.toLowerCase()];
    
    if (user) {
      setCurrentUser(user);
      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.name}!`,
      });
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Try one of the demo accounts.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("dashboard");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const handleFileUpload = (files: File[], category: string) => {
    toast({
      title: "Upload Successful",
      description: `${files.length} file(s) uploaded to ${category} category.`,
    });
    
    // In a real app, this would upload to the backend
    console.log('Uploading files:', files, 'to category:', category);
  };

  const handleFileSelect = (file: any) => {
    toast({
      title: "File Selected",
      description: `Opening ${file.name}`,
    });
    
    // In a real app, this would open/download the file
    console.log('Selected file:', file);
  };

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole={currentUser.role} 
        userName={currentUser.name}
        onLogout={handleLogout} 
      />
      
      <main className="container mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            File Management Dashboard
          </h1>
          <p className="text-muted-foreground">
            {currentUser.role === 'admin' 
              ? 'Full system access - manage all medical categories'
              : `Category access: ${currentUser.allowedCategories.join(', ')}`
            }
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="browse">Browse Files</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <DashboardStats 
              userRole={currentUser.role}
              allowedCategories={currentUser.allowedCategories}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <UploadZone 
              allowedCategories={currentUser.allowedCategories}
              onUpload={handleFileUpload}
            />
          </TabsContent>

          <TabsContent value="browse" className="space-y-6">
            <CategoryBrowser 
              allowedCategories={currentUser.allowedCategories}
              onFileSelect={handleFileSelect}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};