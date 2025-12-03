import { Sun, Moon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import HelpTooltip from "./HelpTooltip";
import { useTheme } from "@/hooks/use-theme";

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const isCitizenMode = location.pathname === "/citizen";

  return (
    <header className={`border-b border-border sticky top-0 z-50 transition-colors duration-300 ${isCitizenMode ? "bg-green-50/90 dark:bg-green-950/20 border-green-200 dark:border-green-900" : "bg-card"
      }`}>
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors duration-300 ${isCitizenMode ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"
            }`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-6 h-6"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-foreground tracking-tight leading-none">
              SuryaVerify
            </h1>
            <span className="text-xs font-medium text-muted-foreground">
              {isCitizenMode ? "Citizen Solar Scanner" : "Government Verification"}
            </span>
          </div>
        </div>

        {/* Mode Toggle & Actions */}
        <div className="flex items-center gap-4">
          {/* Mode Switcher */}
          <div className="hidden md:flex bg-secondary/50 p-1 rounded-lg border border-border">
            <button
              onClick={() => navigate("/")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!isCitizenMode
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Government
            </button>
            <button
              onClick={() => navigate("/citizen")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${isCitizenMode
                ? "bg-background shadow-sm text-green-600 dark:text-green-400"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Citizen (AR)
            </button>
          </div>

          <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
};

export default Header;
