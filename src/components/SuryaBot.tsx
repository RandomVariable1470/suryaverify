import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Sparkles, Bot } from "lucide-react";
import { chatWithSuryaBot } from "@/services/inferenceService";
import { useLocation } from "react-router-dom";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const SuryaBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Namaste! I'm SuryaBot ☀️. I can help you verify solar potential or answer questions about going solar. How can I help you today?",
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            // Get context based on current route
            const isCitizenMode = location.pathname === "/citizen";
            const context = {
                mode: isCitizenMode ? "Citizen (AR)" : "Government (Satellite)",
                // In a real app, we'd pass actual results here if available in a global store
            };

            const response = await chatWithSuryaBot(userMessage, context);
            setMessages((prev) => [...prev, { role: "assistant", content: response }]);
        } catch (error) {
            console.error("SuryaBot error:", error);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I'm having trouble connecting to the sun right now. Please try again later." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <Card className="mb-4 w-[350px] h-[500px] flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    {/* Header */}
                    <div className="p-4 bg-primary text-primary-foreground rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/20 rounded-full">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">SuryaBot AI</h3>
                                <p className="text-xs text-primary-foreground/80">Always here to help</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="space-y-4" ref={scrollRef}>
                            {messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-br-none"
                                                : "bg-muted text-foreground rounded-bl-none"
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <div className="p-3 border-t bg-background">
                        <div className="relative flex items-center">
                            <Input
                                placeholder="Ask about solar..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pr-10 rounded-full"
                            />
                            <Button
                                size="icon"
                                className="absolute right-1 h-8 w-8 rounded-full"
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            <button
                                onClick={() => setInput("Is my roof suitable?")}
                                className="whitespace-nowrap text-xs px-3 py-1 bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
                            >
                                Is my roof suitable?
                            </button>
                            <button
                                onClick={() => setInput("How much can I save?")}
                                className="whitespace-nowrap text-xs px-3 py-1 bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
                            >
                                How much can I save?
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            <Button
                size="lg"
                className={`rounded-full h-14 w-14 shadow-lg transition-all duration-300 ${isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
                    } bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white`}
                onClick={() => setIsOpen(true)}
            >
                <MessageCircle className="w-7 h-7" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
            </Button>
        </div>
    );
};

export default SuryaBot;
