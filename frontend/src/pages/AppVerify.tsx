import Header from "@/components/Header";
import VerificationSection from "@/components/VerificationSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Eye,
  Download,
  MoreHorizontal,
  History
} from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const AppVerify = () => {
  const recentVerifications = [
    {
      id: 1,
      query: "e3b0c44298fc1c149afb...",
      type: "hash",
      result: "verified",
      timestamp: "2024-01-20 14:30",
      filename: "Product_Photo_Final.jpg"
    },
    {
      id: 2,
      query: "uploaded_image_001.png",
      type: "upload",
      result: "unverified", 
      timestamp: "2024-01-20 10:15",
      filename: "Unknown file"
    },
    {
      id: 3,
      query: "a1b2c3d4e5f6789...",
      type: "hash",
      result: "verified",
      timestamp: "2024-01-19 16:45",
      filename: "Brand_Guidelines.pdf"
    },
    {
      id: 4,
      query: "uploaded_image_002.jpg",
      type: "upload",
      result: "processing",
      timestamp: "2024-01-19 09:20",
      filename: "Processing..."
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
              <h1 className="text-3xl font-bold">Verify Content</h1>
              <p className="text-muted-foreground">
                Check authenticity of digital content instantly
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Verification Section */}
            <div>
              <VerificationSection />
            </div>

            {/* Verification History */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Your Verification History
                  </CardTitle>
                  <CardDescription>
                    Track your recent verification queries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentVerifications.map((verification) => (
                      <div key={verification.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            {verification.type === 'hash' ? 'H' : 'F'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {verification.type === 'hash' 
                                ? `${verification.query.substring(0, 20)}...`
                                : verification.query
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {verification.timestamp} • {verification.filename}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant={
                              verification.result === 'verified' ? 'default' : 
                              verification.result === 'unverified' ? 'destructive' : 
                              'secondary'
                            }
                            className="text-xs"
                          >
                            {verification.result === 'verified' ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : verification.result === 'unverified' ? (
                              <AlertCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <Clock className="w-3 h-3 mr-1" />
                            )}
                            {verification.result}
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
                                Download Report
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Search className="h-4 w-4 mr-2" />
                                Verify Again
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                    
                    <Button variant="ghost" className="w-full">
                      View All Verifications
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Verification Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Hash verification</p>
                      <p className="text-muted-foreground">Most accurate for exact file matches</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Upload verification</p>
                      <p className="text-muted-foreground">Detects embedded watermarks</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">API integration</p>
                      <p className="text-muted-foreground">Automate verification workflows</p>
                    </div>
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

export default AppVerify;