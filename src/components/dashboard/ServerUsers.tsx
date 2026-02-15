import { UserInfo } from "@/types/vps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen } from "lucide-react";

interface ServerUsersProps {
  users: UserInfo[];
}

const ServerUsers = ({ users }: ServerUsersProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          مستخدمو السيرفر
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {users.map((user) => (
            <div
              key={user.name}
              className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 truncate">
                  <FolderOpen className="h-2.5 w-2.5 shrink-0" />
                  {user.home}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerUsers;
