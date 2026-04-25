import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Server, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email({ message: "بريد إلكتروني غير صالح" }).max(255),
  password: z.string().min(6, { message: "كلمة المرور 6 أحرف على الأقل" }).max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  const handle = async (mode: "signin" | "signup") => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) {
          if (error.message.includes("غير مسموح") || error.message.toLowerCase().includes("not allowed"))
            toast.error("هذا البريد غير مسموح له بالدخول");
          else if (error.message.toLowerCase().includes("already"))
            toast.error("الحساب موجود بالفعل، سجّل دخولك");
          else toast.error(error.message);
          return;
        }
        toast.success("تم إنشاء الحساب بنجاح");
        navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error("البريد أو كلمة المرور غير صحيحة");
          return;
        }
        navigate("/", { replace: true });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Server className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="font-mono">VPS Monitor</CardTitle>
          <CardDescription>سجّل الدخول للوصول إلى لوحة التحكم</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
            </TabsList>

            {(["signin", "signup"] as const).map((mode) => (
              <TabsContent key={mode} value={mode} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor={`email-${mode}`}>البريد الإلكتروني</Label>
                  <Input
                    id={`email-${mode}`}
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`pwd-${mode}`}>كلمة المرور</Label>
                  <Input
                    id={`pwd-${mode}`}
                    type="password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button className="w-full" disabled={busy} onClick={() => handle(mode)}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  {mode === "signin" ? "دخول" : "إنشاء الحساب"}
                </Button>
              </TabsContent>
            ))}
          </Tabs>

          <p className="text-xs text-muted-foreground text-center mt-4">
            الدخول مقتصر على عناوين البريد المسموح بها فقط
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
