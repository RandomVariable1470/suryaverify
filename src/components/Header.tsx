import { Sun, Download } from "lucide-react";
import { Button } from "./ui/button";
import BulkUploadDialog from "./BulkUploadDialog";

interface HeaderProps {
  onBulkUpload: (coordinates: Array<{ lat: number; lon: number; sample_id?: string }>) => void;
  onExport: () => void;
  hasResults: boolean;
}

const Header = ({ onBulkUpload, onExport, hasResults }: HeaderProps) => {
  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <Sun className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">SuryaVerify</h1>
            <p className="text-xs text-muted-foreground">PM Surya Ghar Solar Verification</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BulkUploadDialog onUpload={onBulkUpload} />
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
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
