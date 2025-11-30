import { Sun, Download, HelpCircle } from "lucide-react";
import { Button } from "./ui/button";
import BulkUploadDialog from "./BulkUploadDialog";

interface HeaderProps {
  onBulkUpload: (coordinates: Array<{ lat: number; lon: number; sample_id?: string }>) => void;
  onExport: () => void;
  hasResults: boolean;
}

const Header = ({ onBulkUpload, onExport, hasResults }: HeaderProps) => {
  return (
    <header className="border-b border-border/50 bg-card shadow-sm backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 shadow-md">
            <Sun className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">SuryaVerify</h1>
            <p className="text-xs text-muted-foreground mt-0.5">PM Surya Ghar Solar Verification</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 hover:bg-muted/50 transition-all"
            onClick={() => window.open('/help', '_blank')}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Help</span>
          </Button>
          
          <BulkUploadDialog onUpload={onBulkUpload} />
          
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all"
            onClick={onExport}
            disabled={!hasResults}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
