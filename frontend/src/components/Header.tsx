import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./theme-toggle";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-width section-padding">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-xl font-semibold gradient-text">
              Hatchmark
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/features" 
              className={`text-sm transition-colors ${
                isActive('/features') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Features
            </Link>
            <Link 
              to="/upload" 
              className={`text-sm transition-colors ${
                isActive('/upload') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upload
            </Link>
            <Link 
              to="/verify" 
              className={`text-sm transition-colors ${
                isActive('/verify') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Verify
            </Link>
            <Link 
              to="/pricing" 
              className={`text-sm transition-colors ${
                isActive('/pricing') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pricing
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            <Link to="/signin">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/get-started">
              <Button size="sm" className="epic-glow">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button
              className="p-2 hover:bg-accent rounded-md transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-in-up">
            <nav className="flex flex-col space-y-4 mb-4">
              <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link to="/upload" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Upload
              </Link>
              <Link to="/verify" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Verify
              </Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
            </nav>
            <div className="flex flex-col space-y-2">
              <Link to="/signin">
                <Button variant="ghost" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/get-started">
                <Button size="sm" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;