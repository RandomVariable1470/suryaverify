import { FileUp, Download, Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";
import BulkUploadDialog from "./BulkUploadDialog";
import HelpTooltip from "./HelpTooltip";
import { useTheme } from "@/hooks/use-theme";

interface HeaderProps {
  onBulkUpload: (coordinates: Array<{ lat: number; lon: number; sample_id?: string }>) => void;
}

const Header = ({ onBulkUpload }: HeaderProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-6 h-6 text-primary-foreground"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            SuryaVerify
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <BulkUploadDialog onUpload={onBulkUpload} />

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Sun className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          <HelpTooltip />
        </div>
      </div>
    </header>
  );
};

export default Header;
