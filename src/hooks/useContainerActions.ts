import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ContainerAction = "start" | "stop" | "restart" | "remove" | "logs";

interface ActionResult {
  output?: string;
  error?: string;
  success?: boolean;
}

export const useContainerActions = (onAfterAction?: () => void) => {
  const [pending, setPending] = useState<Record<string, ContainerAction | null>>({});

  const runAction = useCallback(
    async (container: string, action: ContainerAction, tail = 200): Promise<ActionResult> => {
      setPending((p) => ({ ...p, [container]: action }));
      try {
        const { data, error } = await supabase.functions.invoke("container-action", {
          body: { container, action, tail },
        });
        if (error) throw new Error(error.message || "فشل تنفيذ الأمر");
        if (data?.error) throw new Error(data.error);

        if (action !== "logs") {
          toast.success(`تم تنفيذ ${action} على ${container}`);
          onAfterAction?.();
        }
        return data as ActionResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : "فشل تنفيذ الأمر";
        if (action !== "logs") toast.error(message);
        return { error: message };
      } finally {
        setPending((p) => ({ ...p, [container]: null }));
      }
    },
    [onAfterAction]
  );

  const isPending = (container: string) => pending[container] != null;
  const pendingAction = (container: string) => pending[container] ?? null;

  return { runAction, isPending, pendingAction };
};
