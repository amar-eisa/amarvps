import { useState } from "react";
import { useVpsData } from "@/hooks/useVpsData";
import StatCard from "@/components/dashboard/StatCard";
import ResourceOverview from "@/components/dashboard/ResourceOverview";
import DiskUsage from "@/components/dashboard/DiskUsage";
import NetworkIO from "@/components/dashboard/NetworkIO";
import ServicesTable from "@/components/dashboard/ServicesTable";
import CpuRamChart from "@/components/dashboard/CpuRamChart";
import ContainersTable from "@/components/dashboard/ContainersTable";
import RecentCommands from "@/components/dashboard/RecentCommands";
import ServerUsers from "@/components/dashboard/ServerUsers";
import ServiceTimeline from "@/components/dashboard/ServiceTimeline";
import DashboardToolbar from "@/components/dashboard/DashboardToolbar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Network, Container, Wifi, WifiOff, RefreshCw, Settings, Clock, Server, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRefreshInterval } from "@/hooks/useRefreshInterval";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useTvMode } from "@/hooks/useTvMode";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { interval: refreshInterval } = useRefreshInterval();
  const { data, loading, error, lastUpdated, refresh, history, serviceEvents } = useVpsData(refreshInterval);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const filtered = useDashboardFilter(data, query);
  const { enabled: tvMode, toggle: toggleTvMode } = useTvMode();

  const runningServices = data?.services.filter((s) => s.status === "running").length ?? 0;
  const totalPorts = data?.services.length ?? 0;
  const isConnected = !error && !!data;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold font-mono">VPS Monitor</h1>
            {data && (
              <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
                {data.hostname}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user?.email && (
              <span className="text-xs text-muted-foreground font-mono hidden md:inline" dir="ltr">
                {user.email}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={refresh} disabled={loading} title="تحديث">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} title="الإعدادات">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="تسجيل الخروج">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Toolbar: search, export, TV mode */}
        <DashboardToolbar
          query={query}
          onQueryChange={setQuery}
          data={data}
          tvMode={tvMode}
          onToggleTvMode={toggleTvMode}
        />

        {query && filtered && (
          <div className="text-xs text-muted-foreground">
            {filtered.matchCount > 0
              ? `${filtered.matchCount} نتيجة مطابقة لـ "${query}"`
              : `لا توجد نتائج لـ "${query}"`}
          </div>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground tv-hide">
            <Clock className="h-3 w-3" />
            <span>آخر تحديث: {lastUpdated.toLocaleTimeString("ar-EG")}</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="البورتات المفتوحة"
            value={totalPorts}
            icon={Network}
            variant="default"
          />
          <StatCard
            title="الحاويات النشطة"
            value={`${runningServices} / ${totalPorts}`}
            icon={Container}
            variant="success"
          />
          <StatCard
            title="حالة الاتصال"
            value={isConnected ? "متصل" : "غير متصل"}
            icon={isConnected ? Wifi : WifiOff}
            variant={isConnected ? "success" : "destructive"}
            description={data?.uptime ? `Uptime: ${data.uptime}` : undefined}
          />
        </div>

        {/* Resource overview */}
        {data && (
          <ResourceOverview
            cpuPercent={data.cpu_percent}
            ramPercent={data.ram_percent}
            ramUsedMb={data.ram_used_mb}
            ramTotalMb={data.ram_total_mb}
          />
        )}

        {/* Disk usage */}
        {data?.disks && data.disks.length > 0 && <DiskUsage disks={data.disks} />}

        {/* Network I/O */}
        {data?.network && <NetworkIO network={data.network} />}

        {/* CPU/RAM History Chart */}
        <div className="tv-hide">
          <CpuRamChart data={history} />
        </div>

        {/* Service Status Timeline */}
        <div className="tv-hide">
          <ServiceTimeline events={serviceEvents} />
        </div>

        {/* Services table */}
        {filtered && <ServicesTable services={filtered.services} />}

        {/* Containers with owners */}
        {filtered?.containers && filtered.containers.length > 0 && (
          <ContainersTable containers={filtered.containers} onAfterAction={refresh} />
        )}

        {/* Server Users */}
        {filtered?.users && filtered.users.length > 0 && (
          <div className="tv-hide">
            <ServerUsers users={filtered.users} />
          </div>
        )}

        {/* Recent Commands */}
        {filtered?.recent_commands && filtered.recent_commands.length > 0 && (
          <div className="tv-hide">
            <RecentCommands commands={filtered.recent_commands} />
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-card/50 animate-pulse" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
