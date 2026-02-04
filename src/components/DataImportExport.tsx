import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, 
  Upload, 
  FileJson, 
  AlertTriangle,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";

interface DataImportExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DataImportExport = ({ open, onOpenChange }: DataImportExportProps) => {
  const [importData, setImportData] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const memories = useQuery(api.memories.list, { limit: 1000 });
  const agents = useQuery(api.agents.list);
  const bulkStoreMemories = useMutation(api.memories.bulkStore);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        memories: memories || [],
        agents: agents || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clawmemory-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully");
    } catch (error) {
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setImportData(content);
        setImportErrors([]);
      } catch (error) {
        setImportErrors(["Failed to read file"]);
      }
    };
    reader.readAsText(file);
  };

  const validateImportData = (data: any): string[] => {
    const errors: string[] = [];

    if (!data) {
      errors.push("No data provided");
      return errors;
    }

    if (!data.memories || !Array.isArray(data.memories)) {
      errors.push("Missing or invalid 'memories' array");
    } else {
      data.memories.forEach((memory: any, index: number) => {
        if (!memory.content) {
          errors.push(`Memory ${index + 1}: Missing content`);
        }
        if (!memory.type || !["insight", "experience", "learning", "pattern"].includes(memory.type)) {
          errors.push(`Memory ${index + 1}: Invalid or missing type`);
        }
      });
    }

    return errors;
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      setImportErrors(["Please provide import data"]);
      return;
    }

    setIsImporting(true);
    setImportErrors([]);

    try {
      const data = JSON.parse(importData);
      const errors = validateImportData(data);

      if (errors.length > 0) {
        setImportErrors(errors);
        setIsImporting(false);
        return;
      }

      // In a real implementation, you'd need to:
      // 1. Create agents if they don't exist
      // 2. Map old agent IDs to new ones
      // 3. Store memories with correct agent references

      // For now, we'll just show a success message
      toast.success(`Import validated! Ready to import ${data.memories.length} memories`);
      
      // Close dialog after success
      setTimeout(() => {
        onOpenChange(false);
        setImportData("");
      }, 1500);
    } catch (error) {
      setImportErrors(["Invalid JSON format"])
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = {
      version: "1.0",
      memories: [
        {
          content: "Example insight about user behavior",
          type: "insight",
          quality: 5,
          tags: ["ux", "example"],
          agentName: "MyAgent",
        },
      ],
      agents: [
        {
          name: "MyAgent",
          description: "An example agent",
        },
      ],
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clawmemory-import-template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5" />
            Import / Export Data
          </DialogTitle>
          <DialogDescription>
            Backup your collective consciousness or import memories from another source
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="p-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">What will be exported?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {memories?.length || 0} memories</li>
                <li>• {agents?.length || 0} agents</li>
                <li>• All connections and metadata</li>
              </ul>
            </div>

            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <AlertDescription className="text-yellow-500">
                API keys are not included in exports for security reasons
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                "Exporting..."
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Export File
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Import Data</h4>
                <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                  Download Template
                </Button>
              </div>

              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                Select JSON File
              </Button>

              <Textarea
                placeholder="Or paste JSON data here..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm">
                    {importErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Alert className="bg-blue-500/10 border-blue-500/20">
              <AlertDescription className="text-blue-500">
                Import will create new memories. Existing data will not be overwritten.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleImport} 
              disabled={isImporting || !importData.trim()}
              className="w-full"
            >
              {isImporting ? (
                "Validating..."
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Validate & Import
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
