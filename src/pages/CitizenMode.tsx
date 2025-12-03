import { useState } from 'react';
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Camera, CheckCircle2, ChevronRight, Info, Ruler, Sun } from "lucide-react";
import ARScanner from "@/components/AR/ARScanner";

const CitizenMode = () => {
    const [step, setStep] = useState<'intro' | 'scanning' | 'results'>('intro');
    const [hasPermissions, setHasPermissions] = useState(false);
    const [results, setResults] = useState<any>(null);

    const startScanning = async () => {
        // In a real app, we'd check for camera/XR permissions here
        // For now, we'll just simulate it
        setHasPermissions(true);
        setStep('scanning');
    };

    const handleScanComplete = (data: any) => {
        if (data) {
            setResults(data);
            setStep('results');
        } else {
            // Cancelled
            setStep('intro');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <Header />

            <main className="flex-1 relative overflow-hidden">
                {step === 'intro' && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-green-50 to-background dark:from-green-950/20 dark:to-background">
                        <div className="max-w-md w-full space-y-8 text-center">
                            <div className="space-y-2">
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Sun className="w-10 h-10 text-green-600 dark:text-green-400" />
                                </div>
                                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                                    Visualize Solar on Your Roof
                                </h2>
                                <p className="text-muted-foreground text-lg">
                                    Use Augmented Reality to see how many panels fit and how much you can save.
                                </p>
                            </div>

                            <div className="grid gap-4 text-left">
                                <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border shadow-sm">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Camera className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Scan Your Roof</h3>
                                        <p className="text-sm text-muted-foreground">Point your camera at a flat roof surface</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border shadow-sm">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Ruler className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Mark the Area</h3>
                                        <p className="text-sm text-muted-foreground">Tap corners to define the installation area</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border shadow-sm">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Get Instant Results</h3>
                                        <p className="text-sm text-muted-foreground">See potential savings and environmental impact</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                className="w-full text-lg h-12 bg-green-600 hover:bg-green-700 text-white"
                                onClick={startScanning}
                            >
                                Start AR Scan <ChevronRight className="ml-2 w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'scanning' && (
                    <ARScanner onComplete={handleScanComplete} />
                )}

                {step === 'results' && results && (
                    <div className="absolute inset-0 z-10 flex flex-col p-6 bg-background overflow-y-auto">
                        <div className="max-w-md w-full mx-auto space-y-6">
                            <div className="text-center space-y-2">
                                <div className="inline-flex items-center justify-center p-3 bg-green-100 dark:bg-green-900/50 rounded-full mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h2 className="text-2xl font-bold">Analysis Complete!</h2>
                                <p className="text-muted-foreground">Here is your rooftop solar potential</p>
                            </div>

                            <Card className="p-6 space-y-6 border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/10">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Usable Area</p>
                                        <p className="text-2xl font-bold">{results.areaSqM.toFixed(1)} m²</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">System Size</p>
                                        <p className="text-2xl font-bold">{results.capacityKW.toFixed(1)} kW</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Panels</p>
                                        <p className="text-2xl font-bold">{results.panelCount}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Monthly Savings</p>
                                        <p className="text-2xl font-bold text-green-600">₹{Math.round(results.monthlySavings).toLocaleString()}</p>
                                    </div>
                                </div>
                            </Card>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Environmental Impact</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                            <AlertCircle className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">CO₂ Reduced</p>
                                            <p className="text-xl font-bold">{Math.round(results.co2Reduction)} kg/year</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                                            <Sun className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Equivalent Trees</p>
                                            <p className="text-xl font-bold">{results.treesSaved} trees</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 space-y-3">
                                <Button className="w-full" size="lg" onClick={() => window.print()}>
                                    Download Report
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => setStep('intro')}>
                                    Start New Scan
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CitizenMode;
