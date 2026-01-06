import { useUserPresence } from "@/hooks/useUserPresence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Wifi } from "lucide-react";
import OnlineIndicator from "./OnlineIndicator";

const OnlineUsersWidget = () => {
  const { onlineUsers, onlineCount } = useUserPresence();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            <span>Online Agora</span>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
            {onlineCount} {onlineCount === 1 ? "usuário" : "usuários"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {onlineUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum usuário online no momento
          </p>
        ) : (
          <ScrollArea className="max-h-48">
            <div className="flex flex-wrap gap-2">
              {onlineUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <OnlineIndicator
                      isOnline={true}
                      size="sm"
                      className="absolute -bottom-0.5 -right-0.5"
                    />
                  </div>
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {user.full_name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default OnlineUsersWidget;
