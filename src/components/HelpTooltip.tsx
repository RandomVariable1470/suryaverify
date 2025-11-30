import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const HelpTooltip = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <HelpCircle className="w-5 h-5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">How to use SuryaVerify</h4>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-semibold text-primary">1️⃣</span>
              <span>Enter latitude and longitude coordinates</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-primary">2️⃣</span>
              <span>Run verification to analyze satellite imagery</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-primary">3️⃣</span>
              <span>Review rooftop evidence and AI detection results</span>
            </li>
          </ol>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default HelpTooltip;
