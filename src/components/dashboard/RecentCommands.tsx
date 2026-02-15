import { CommandEntry } from "@/types/vps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal } from "lucide-react";

interface RecentCommandsProps {
  commands: CommandEntry[];
}

const RecentCommands = ({ commands }: RecentCommandsProps) => {
  const isDockerCommand = (cmd: string) =>
    cmd.startsWith("docker") || cmd.startsWith("docker-compose");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          آخر الأوامر المنفذة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {commands.map((entry, i) => (
              <div
                key={i}
                className={`flex gap-2 items-start text-xs font-mono px-2 py-1.5 rounded ${
                  isDockerCommand(entry.command)
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50"
                }`}
              >
                <span className="text-muted-foreground shrink-0 min-w-[60px]">
                  {entry.user}$
                </span>
                <span className="break-all">{entry.command}</span>
              </div>
            ))}
            {commands.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                لا توجد أوامر حديثة
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecentCommands;
