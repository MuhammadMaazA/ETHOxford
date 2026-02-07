import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Search, 
  Shield, 
  BarChart3, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  Eye,
  Download
} from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  // Mock data - in real app this would come from API
  const userStats = {
    uploadsThisMonth: 7,
    uploadsLimit: 10,
    totalUploads: 23,
    verifiedFiles: 21,
    pendingVerifications: 2
  };

  const recentUploads = [
    {
      id: 1,
      name: "Product_Photo_Final.jpg",
      uploadDate: "2024-01-20",
      status: "verified",
      type: "image"
    },
    {
      id: 2,
      name: "Brand_Guidelines.pdf",
      uploadDate: "2024-01-19",
      status: "verified",
      type: "document"
    },
    {
      id: 3,
      name: "Logo_Variations.png",
      uploadDate: "2024-01-18",
      status: "pending",
      type: "image"
    }
  ];

  const quickActions = [
    {
      title: "Upload New File",
      description: "Protect your creative work",
      icon: Upload,
      href: "/app/upload",
      variant: "default" as const
    },
    {
      title: "Verify File",
      description: "Check authenticity",
      icon: Search,
      href: "/app/verify",
      variant: "outline" as const
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="pt-24 pb-16">
        <div className="max-width section-padding">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
            <p className="text-muted-foreground">
              Here's an overview of your protected creative assets
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.uploadsThisMonth}</div>
                <div className="mt-2">
                  <Progress 
                    value={(userStats.uploadsThisMonth / userStats.uploadsLimit) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {userStats.uploadsThisMonth} of {userStats.uploadsLimit} uploads used
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Protected</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.totalUploads}</div>
                <p className="text-xs text-muted-foreground">
                  Files under protection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{userStats.verifiedFiles}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully verified
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{userStats.pendingVerifications}</div>
                <p className="text-xs text-muted-foreground">
                  Processing verification
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Jump into the most common tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant}
                    className="w-full justify-start h-auto p-4"
                    asChild
                  >
                    <Link to={action.href}>
                      <div className="flex items-center gap-3">
                        <action.icon className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">{action.title}</div>
                          <div className="text-sm opacity-70">{action.description}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </div>
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Recent Uploads */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Uploads
                </CardTitle>
                <CardDescription>
                  Your latest protected files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUploads.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          {file.type === 'image' ? '🖼️' : '📄'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.uploadDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={file.status === 'verified' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {file.status === 'verified' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertCircle className="w-3 h-3 mr-1" />
                          )}
                          {file.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button variant="ghost" className="w-full" asChild>
                    <Link to="/uploads">
                      View All Uploads
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Warning */}
          {userStats.uploadsThisMonth >= userStats.uploadsLimit * 0.8 && (
            <Card className="mt-8 border-warning">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertCircle className="h-5 w-5" />
                  Usage Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  You've used {userStats.uploadsThisMonth} of your {userStats.uploadsLimit} monthly uploads. 
                  Consider upgrading to continue protecting your creative work.
                </p>
                <Button variant="outline" asChild>
                  <Link to="/pricing">
                    View Pricing Plans
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;