export interface DiskInfo {
  mount: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent: number;
}

export interface NetworkInfo {
  bytes_sent_mb: number;
  bytes_recv_mb: number;
  packets_sent: number;
  packets_recv: number;
}

export interface VpsData {
  cpu_percent: number;
  ram_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
  uptime: string;
  hostname: string;
  services: ServiceInfo[];
  disks?: DiskInfo[];
  network?: NetworkInfo;
  users?: UserInfo[];
  recent_commands?: CommandEntry[];
  containers?: ContainerInfo[];
}

export interface ServiceInfo {
  port: number;
  name: string;
  pid: number | null;
  status: "running" | "stopped";
}

export interface UserInfo {
  name: string;
  home: string;
}

export interface CommandEntry {
  user: string;
  command: string;
}

export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  port: string;
  owner: string;
  cpu_percent?: number;
  mem_mb?: number;
}
