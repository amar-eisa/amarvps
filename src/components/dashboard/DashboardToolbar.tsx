import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Tv, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VpsData } from "@/types/vps";
import { exportAsCsv, exportAsJson } from "@/lib/exportData";

interface DashboardToolbarProps {
  query: string;
  onQueryChange: (v: string) => void;
  data: VpsData | null;
  tvMode: boolean;
  onToggleTvMode: () => void;
}

const DashboardToolbar = ({
  query,
  onQueryChange,
  data,
  tvMode,
  onToggleTvMode,
}: DashboardToolbarProps) => {
  const canExport = !!data;

  const exportAll = (fmt: "csv" | "json") => {
    if (!data) return;
    if (fmt === "json") {
      exportAsJson(data, "vps-snapshot");
      return;
    }
    // CSV: export each section as a separate file doesn't fit one click — flatten services instead
    exportAsCsv(
      data.services.map((s) => ({ port: s.port, name: s.name, pid: s.pid ?? "", status: s.status })),
      "vps-services"
    );
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="بحث في الحاويات، البورتات، الأوامر، المستخدمين..."
          className="pr-9 pl-9 font-mono text-sm"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="مسح البحث"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!canExport} className="gap-1.5">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">تصدير البيانات</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportAll("json")}>
              اللقطة كاملة (JSON)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportAll("csv")}>
              الخدمات (CSV)
            </DropdownMenuItem>
            {data?.containers && data.containers.length > 0 && (
              <DropdownMenuItem onClick={() => exportAsCsv(data.containers!, "vps-containers")}>
                الحاويات (CSV)
              </DropdownMenuItem>
            )}
            {data?.recent_commands && data.recent_commands.length > 0 && (
              <DropdownMenuItem
                onClick={() => exportAsCsv(data.recent_commands!, "vps-commands")}
              >
                الأوامر (CSV)
              </DropdownMenuItem>
            )}
            {data?.users && data.users.length > 0 && (
              <DropdownMenuItem onClick={() => exportAsCsv(data.users!, "vps-users")}>
                المستخدمون (CSV)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={tvMode ? "default" : "outline"}
          size="sm"
          onClick={onToggleTvMode}
          className="gap-1.5"
          title="وضع العرض الكبير"
        >
          <Tv className="h-4 w-4" />
          <span className="hidden sm:inline">TV Mode</span>
        </Button>
      </div>
    </div>
  );
};

export default DashboardToolbar;
