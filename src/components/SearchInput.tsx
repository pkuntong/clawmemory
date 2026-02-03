import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SearchInputProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
}

export const SearchInput = ({
  placeholder = "Search collective memory...",
  className,
  onSearch,
}: SearchInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div
        className={cn(
          "relative flex items-center transition-all duration-300",
          "rounded-xl border bg-muted/30 backdrop-blur-sm",
          isFocused
            ? "border-primary shadow-glow-sm"
            : "border-border/50 hover:border-border"
        )}
      >
        <Search
          className={cn(
            "absolute left-4 w-5 h-5 transition-colors",
            isFocused ? "text-primary" : "text-muted-foreground"
          )}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={cn(
            "w-full py-3 pl-12 pr-4 bg-transparent",
            "text-foreground placeholder:text-muted-foreground",
            "font-mono text-sm",
            "focus:outline-none"
          )}
        />
        
        {value && (
          <div className="absolute right-3 flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-muted-foreground bg-muted rounded border border-border">
              Enter
            </kbd>
          </div>
        )}
      </div>
      
      {/* Semantic search hint */}
      <p className="mt-2 text-xs text-muted-foreground/70 text-center">
        Powered by semantic search • Try: "agent problem solving patterns"
      </p>
    </form>
  );
};
