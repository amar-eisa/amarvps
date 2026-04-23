import { useMemo, useState } from "react";
import { ContainerInfo } from "@/types/vps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Container,
  User,
  Play,
  Square,
  RotateCw,
  Trash2,
  FileText,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import { useContainerActions, ContainerAction } from "@/hooks/useContainerActions";
import ContainerLogsDialog from "./ContainerLogsDialog";

interface ContainersTableProps {
  containers: ContainerInfo[];
  onAfterAction?: () => void;
}

type SortKey = "cpu" | "mem" | "name" | "status";
type SortDir = "asc" | "desc";

const isRunning = (status: string) => status.toLowerCase().includes("up");

const ContainersTable = ({ containers, onAfterAction }: ContainersTableProps) => {
  const { runAction, isPending, pendingAction } = useContainerActions(onAfterAction);
  const [logsFor, setLogsFor] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("cpu");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...containers];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "cpu":
          return ((a.cpu_percent ?? 0) - (b.cpu_percent ?? 0)) * dir;
        case "mem":
          return ((a.mem_mb ?? 0) - (b.mem_mb ?? 0)) * dir;
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "status":
          return (Number(isRunning(b.status)) - Number(isRunning(a.status))) * dir;
        default:
          return 0;
      }
    });
    return arr;
  }, [containers, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const SortHead = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "text-primary" : "opacity-50"}`} />
    </button>
  );

  const ActionBtn = ({
    container,
    action,
    icon: Icon,
    label,
    variant = "ghost",
    disabled = false,
    onClick,
  }: {
    container: string;
    action: ContainerAction;
    icon: typeof Play;
    label: string;
    variant?: "ghost" | "outline" | "destructive";
    disabled?: boolean;
    onClick?: () => void;
  }) => {
    const busy = isPending(container) && pendingAction(container) === action;
    return (
      <Button
        size="icon"
        variant={variant}
        className="h-7 w-7"
        title={label}
        disabled={disabled || isPending(container)}
        onClick={onClick ?? (() => runAction(container, action))}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Container className="h-4 w-4 text-primary" />
          الحاويات ومالكيها
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">اسم الحاوية</TableHead>
              <TableHead className="text-right">ID</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">البورت</TableHead>
              <TableHead className="text-right">المالك</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containers.map((c) => {
              const running = isRunning(c.status);
              const target = c.name || c.id;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.id.substring(0, 12)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={running ? "default" : "destructive"}
                      className="text-[10px]"
                    >
                      {running ? "running" : "exited"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.port && c.port !== "None" ? c.port : "-"}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-xs">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {c.owner}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ActionBtn
                        container={target}
                        action="start"
                        icon={Play}
                        label="Start"
                        disabled={running}
                      />
                      <ActionBtn
                        container={target}
                        action="stop"
                        icon={Square}
                        label="Stop"
                        disabled={!running}
                      />
                      <ActionBtn
                        container={target}
                        action="restart"
                        icon={RotateCw}
                        label="Restart"
                      />
                      <ActionBtn
                        container={target}
                        action="logs"
                        icon={FileText}
                        label="Logs"
                        onClick={() => setLogsFor(target)}
                      />
                      <ActionBtn
                        container={target}
                        action="remove"
                        icon={Trash2}
                        label="Remove"
                        variant="ghost"
                        onClick={() => setConfirmRemove(target)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <ContainerLogsDialog container={logsFor} onClose={() => setLogsFor(null)} />

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحاوية؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الحاوية <span className="font-mono font-semibold">{confirmRemove}</span> نهائياً.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmRemove) runAction(confirmRemove, "remove");
                setConfirmRemove(null);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ContainersTable;
