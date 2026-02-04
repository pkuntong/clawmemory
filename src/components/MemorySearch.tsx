import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Filter, Search, X } from "lucide-react";
import { format } from "date-fns";

interface SearchFilters {
  query: string;
  type: string | null;
  agentId: string | null;
  quality: number | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  tags: string[];
}

interface MemorySearchProps {
  onSearch: (filters: SearchFilters) => void;
  agents: Array<{ _id: string; name: string }>;
}

export const MemorySearch = ({ onSearch, agents }: MemorySearchProps) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    type: null,
    agentId: null,
    quality: null,
    dateFrom: null,
    dateTo: null,
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({
      query: "",
      type: null,
      agentId: null,
      quality: null,
      dateFrom: null,
      dateTo: null,
      tags: [],
    });
    onSearch({
      query: "",
      type: null,
      agentId: null,
      quality: null,
      dateFrom: null,
      dateTo: null,
      tags: [],
    });
  };

  const addTag = () => {
    if (tagInput && !filters.tags.includes(tagInput)) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const hasActiveFilters = 
    filters.type || 
    filters.agentId || 
    filters.quality || 
    filters.dateFrom || 
    filters.dateTo || 
    filters.tags.length > 0;

  const activeFilterCount = [
    filters.type,
    filters.agentId,
    filters.quality,
    filters.dateFrom,
    filters.dateTo,
    ...filters.tags,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={filters.query}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-80 glass-card border-border/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filters</h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    <X className="w-4 h-4 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Type</label>
                <Select
                  value={filters.type || "all"}
                  onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, type: value === "all" ? null : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="insight">💡 Insight</SelectItem>
                    <SelectItem value="experience">📖 Experience</SelectItem>
                    <SelectItem value="learning">🎓 Learning</SelectItem>
                    <SelectItem value="pattern">🔄 Pattern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Agent Filter */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Agent</label>
                <Select
                  value={filters.agentId || "all"}
                  onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, agentId: value === "all" ? null : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All agents</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent._id} value={agent._id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quality Filter */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Minimum Quality</label>
                <Select
                  value={filters.quality?.toString() || "all"}
                  onValueChange={(value) => 
                    setFilters(prev => ({ 
                      ...prev, 
                      quality: value === "all" ? null : parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any quality</SelectItem>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ (5)</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ (4+)</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ (3+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Date Range</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {filters.dateFrom ? format(filters.dateFrom, "PP") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom || undefined}
                        onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date || null }))}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {filters.dateTo ? format(filters.dateTo, "PP") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo || undefined}
                        onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date || null }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Tags Filter */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Tags</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={addTag}>Add</Button>
                </div>
                {filters.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filters.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={() => { handleSearch(); setShowFilters(false); }}>
                Apply Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button onClick={handleSearch}>
          Search
        </Button>
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.type && (
            <Badge variant="secondary" className="capitalize">
              Type: {filters.type}
              <button onClick={() => setFilters(prev => ({ ...prev, type: null }))} className="ml-1">×</button>
            </Badge>
          )}
          {filters.agentId && (
            <Badge variant="secondary">
              Agent: {agents.find(a => a._id === filters.agentId)?.name || filters.agentId}
              <button onClick={() => setFilters(prev => ({ ...prev, agentId: null }))} className="ml-1">×</button>
            </Badge>
          )}
          {filters.quality && (
            <Badge variant="secondary">
              Quality: {filters.quality}+
              <button onClick={() => setFilters(prev => ({ ...prev, quality: null }))} className="ml-1">×</button>
            </Badge>
          )}
          {filters.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              Tag: {tag}
              <button onClick={() => removeTag(tag)} className="ml-1">×</button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
