import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { useContainerActions } from "@/hooks/useContainerActions";

interface ContainerLogsDialogProps {
  container: string | null;
  onClose: () => void;
}

const ContainerLogsDialog = ({ container, onClose }: ContainerLogsDialogProps) => {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tail, setTail] = useState(200);
  const { runAction } = useContainerActions();

  const load = async (name: string, lines: number) => {
    setLoading(true);
    const result = await runAction(name, "logs", lines);
    setOutput(result.error ? `خطأ: ${result.error}` : result.output ?? "(لا يوجد إخراج)");
    setLoading(false);
  };

  useEffect(() => {
    if (container) {
      setOutput("");
      load(container, tail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container]);

  return (
    <Dialog open={!!container} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm">
            سجلات الحاوية:
            <span className="text-primary">{container}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">آخر:</span>
          {[100, 200, 500, 1000].map((n) => (
            <Button
              key={n}
              size="sm"
              variant={tail === n ? "default" : "outline"}
              onClick={() => {
                setTail(n);
                if (container) load(container, n);
              }}
              disabled={loading}
              className="h-7 px-2 text-xs"
            >
              {n}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 mr-auto"
            onClick={() => container && load(container, tail)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>

        <ScrollArea className="h-[420px] rounded-md border border-border/50 bg-muted/30">
          <pre
            className="p-3 text-[11px] font-mono whitespace-pre-wrap break-all text-left leading-relaxed"
            dir="ltr"
          >
            {loading && !output ? "جاري التحميل..." : output || "(فارغ)"}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ContainerLogsDialog;
