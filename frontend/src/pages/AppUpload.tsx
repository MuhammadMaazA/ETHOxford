import Header from "@/components/Header";
import UploadSection from "@/components/UploadSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Eye,
  Download,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const AppUpload = () => {
  // Mock user data
  const userStats = {
    uploadsThisMonth: 7,
    uploadsLimit: 10,
    totalUploads: 23
  };

  const recentUploads = [
    {
      id: 1,
      name: "Product_Photo_Final.jpg",
      uploadDate: "2024-01-20",
      status: "verified",
      type: "image",
      size: "2.4 MB"
    },
    {
      id: 2,
      name: "Brand_Guidelines.pdf",
      uploadDate: "2024-01-19", 
      status: "verified",
      type: "document",
      size: "1.8 MB"
    },
    {
      id: 3,
      name: "Logo_Variations.png",
      uploadDate: "2024-01-18",
      status: "pending",
      type: "image", 
      size: "856 KB"
    },
    {
      id: 4,
      name: "Website_Mockup.psd",
      uploadDate: "2024-01-17",
      status: "verified",
      type: "image",
      size: "12.3 MB"
    },
    {
      id: 5,
      name: "Client_Contract.pdf", 
      uploadDate: "2024-01-16",
      status: "verified",
      type: "document",
      size: "245 KB"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <section className="pt-24 pb-16">
        <div className="max-width section-padding">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Upload & Protect</h1>
              <p className="text-muted-foreground">
                Secure your creative work with military-grade protection
              </p>
            </div>
          </div>

          {/* Usage Stats */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Monthly Usage
              </CardTitle>
              <CardDescription>
                Track your upload allowance and usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {userStats.uploadsThisMonth} of {userStats.uploadsLimit} uploads used
                </span>
                <span className="text-sm text-muted-foreground">
                  {userStats.uploadsLimit - userStats.uploadsThisMonth} remaining
                </span>
              </div>
              <Progress 
                value={(userStats.uploadsThisMonth / userStats.uploadsLimit) * 100} 
                className="h-2"
              />
              {userStats.uploadsThisMonth >= userStats.uploadsLimit * 0.8 && (
                <p className="text-sm text-warning mt-2">
                  You're running low on uploads. Consider upgrading your plan.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div>
              <UploadSection />
            </div>

            {/* Recent Uploads */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Your Recent Uploads
                  </CardTitle>
                  <CardDescription>
                    Manage and track your protected files
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentUploads.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            {file.type === 'image' ? '🖼️' : '📄'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.uploadDate} • {file.size}
                            </p>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download Certificate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                    
                    <Button variant="ghost" className="w-full">
                      View All Uploads ({userStats.totalUploads})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AppUpload;