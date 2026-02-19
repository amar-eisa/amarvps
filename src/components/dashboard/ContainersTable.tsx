import { ContainerInfo } from "@/types/vps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Container, User } from "lucide-react";

interface ContainersTableProps {
  containers: ContainerInfo[];
}

const ContainersTable = ({ containers }: ContainersTableProps) => {
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {containers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {c.id.substring(0, 12)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={c.status.toLowerCase().includes("up") ? "default" : "destructive"}
                    className="text-[10px]"
                  >
                    {c.status.toLowerCase().includes("up") ? "running" : "exited"}
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ContainersTable;
