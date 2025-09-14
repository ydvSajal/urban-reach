import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { ExportService, ExportOptions } from "@/lib/export";
import { toast } from "@/hooks/use-toast";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTimeRange?: string;
}

const ExportDialog = ({ open, onOpenChange, currentTimeRange }: ExportDialogProps) => {
  const [options, setOptions] = useState<ExportOptions>(() => {
    const defaultOptions = ExportService.getDefaultExportOptions();
    
    // Adjust date range based on current analytics time range
    if (currentTimeRange) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(currentTimeRange));
      
      return {
        ...defaultOptions,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };
    }
    
    return defaultOptions;
  });
  
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await ExportService.exportData(options);
      toast({
        title: "Export successful",
        description: `Data exported as ${options.format.toUpperCase()} file`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: error.message || "An error occurred during export",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDateRange = (field: 'start' | 'end', date: Date | undefined) => {
    if (date) {
      setOptions(prev => ({
        ...prev,
        dateRange: {
          ...prev.dateRange,
          [field]: date.toISOString()
        }
      }));
    }
  };

  const formatOptions = [
    { value: 'csv', label: 'CSV', icon: FileText, description: 'Comma-separated values file' },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Excel-compatible CSV file' },
    { value: 'pdf', label: 'PDF', icon: FileText, description: 'Printable PDF report' }
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Analytics Data
          </DialogTitle>
          <DialogDescription>
            Configure export settings and download your municipal reports analytics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="grid grid-cols-1 gap-3">
              {formatOptions.map((format) => (
                <div
                  key={format.value}
                  className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                    options.format === format.value
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:border-primary/50'
                  }`}
                  onClick={() => setOptions(prev => ({ ...prev, format: format.value }))}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      value={format.value}
                      checked={options.format === format.value}
                      onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as any }))}
                      className="mr-3"
                    />
                    <format.icon className="h-5 w-5 mr-2" />
                  </div>
                  <div>
                    <div className="font-medium">{format.label}</div>
                    <div className="text-sm text-muted-foreground">{format.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <DatePicker
                  date={new Date(options.dateRange.start)}
                  onSelect={(date) => updateDateRange('start', date)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">End Date</Label>
                <DatePicker
                  date={new Date(options.dateRange.end)}
                  onSelect={(date) => updateDateRange('end', date)}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Selected range: {format(new Date(options.dateRange.start), 'MMM dd, yyyy')} - {format(new Date(options.dateRange.end), 'MMM dd, yyyy')}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Filters (Optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select 
                  value={options.filters?.category || "all"} 
                  onValueChange={(value) => 
                    setOptions(prev => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        category: value === "all" ? undefined : value
                      }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="roads">Roads</SelectItem>
                    <SelectItem value="sanitation">Sanitation</SelectItem>
                    <SelectItem value="water_supply">Water Supply</SelectItem>
                    <SelectItem value="electricity">Electricity</SelectItem>
                    <SelectItem value="public_safety">Public Safety</SelectItem>
                    <SelectItem value="parks">Parks</SelectItem>
                    <SelectItem value="drainage">Drainage</SelectItem>
                    <SelectItem value="waste_management">Waste Management</SelectItem>
                    <SelectItem value="street_lights">Street Lights</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select 
                  value={options.filters?.status || "all"} 
                  onValueChange={(value) => 
                    setOptions(prev => ({
                      ...prev,
                      filters: {
                        ...prev.filters,
                        status: value === "all" ? undefined : value
                      }
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select 
                value={options.filters?.priority || "all"} 
                onValueChange={(value) => 
                  setOptions(prev => ({
                    ...prev,
                    filters: {
                      ...prev.filters,
                      priority: value === "all" ? undefined : value
                    }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSummary"
                  checked={options.includeSummary}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeSummary: checked as boolean }))
                  }
                />
                <Label htmlFor="includeSummary" className="text-sm">
                  Include analytics summary
                </Label>
              </div>
              <div className="text-xs text-muted-foreground ml-6">
                Adds charts data, statistics, and key performance indicators to the export
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
