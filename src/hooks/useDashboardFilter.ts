import { useMemo } from "react";
import { VpsData, ContainerInfo, CommandEntry, UserInfo, ServiceInfo } from "@/types/vps";

const matches = (query: string, ...fields: (string | number | null | undefined)[]) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => f !== null && f !== undefined && String(f).toLowerCase().includes(q));
};

export interface FilteredVpsData {
  services: ServiceInfo[];
  containers?: ContainerInfo[];
  users?: UserInfo[];
  recent_commands?: CommandEntry[];
  matchCount: number;
}

export const useDashboardFilter = (data: VpsData | null, query: string): FilteredVpsData | null => {
  return useMemo(() => {
    if (!data) return null;
    const trimmed = query.trim();

    const services = data.services.filter((s) => matches(trimmed, s.port, s.name, s.status));
    const containers = data.containers?.filter((c) =>
      matches(trimmed, c.name, c.id, c.status, c.port, c.owner)
    );
    const users = data.users?.filter((u) => matches(trimmed, u.name, u.home));
    const recent_commands = data.recent_commands?.filter((c) => matches(trimmed, c.user, c.command));

    const matchCount =
      services.length +
      (containers?.length ?? 0) +
      (users?.length ?? 0) +
      (recent_commands?.length ?? 0);

    return { services, containers, users, recent_commands, matchCount };
  }, [data, query]);
};
