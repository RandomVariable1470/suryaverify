import { Loader2, MapPin, Satellite } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface VerificationProgressProps {
  currentIndex: number;
  totalCount: number;
  isImageBased?: boolean;
}

const VerificationProgress = ({ currentIndex, totalCount, isImageBased }: VerificationProgressProps) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const actualProgress = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0;

  useEffect(() => {
    // Smooth animation to actual progress
    const timer = setTimeout(() => {
      setDisplayProgress(actualProgress);
    }, 100);
    return () => clearTimeout(timer);
  }, [actualProgress]);

  const isBatch = totalCount > 1;

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/30 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '4s', animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-2xl w-full mx-auto px-8">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-12 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-primary/10 p-6 rounded-full">
                {isImageBased ? (
                  <Satellite className="h-12 w-12 text-primary animate-pulse" />
                ) : (
                  <MapPin className="h-12 w-12 text-primary animate-pulse" />
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-center mb-3 text-foreground">
            {isBatch ? 'Processing Batch Verification' : 'Analyzing Location'}
          </h2>
          
          {/* Subtitle */}
          <p className="text-center text-muted-foreground mb-8">
            {isImageBased 
              ? 'AI is analyzing the satellite imagery...' 
              : 'Fetching satellite data and running AI detection...'}
          </p>

          {/* Progress info */}
          {isBatch && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-lg font-semibold text-foreground">
                  Processing {currentIndex + 1} of {totalCount}
                </span>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="space-y-3">
            {isBatch ? (
              <>
                <Progress value={displayProgress} className="h-3" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{Math.round(displayProgress)}% Complete</span>
                  <span>{totalCount - currentIndex - 1} remaining</span>
                </div>
              </>
            ) : (
              <div className="relative">
                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-[shimmer_2s_infinite]" 
                       style={{ width: '100%' }} />
                </div>
                <p className="text-center text-sm text-muted-foreground mt-3">
                  This may take a few moments...
                </p>
              </div>
            )}
          </div>

          {/* Status indicators */}
          <div className="mt-8 flex justify-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/60 animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationProgress;
