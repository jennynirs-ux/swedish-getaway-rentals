import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Sparkles } from "lucide-react";

interface TodayItem {
  id: string;
  guest_name: string;
  property_title: string;
  time?: string;
}

interface CleaningItem {
  id: string;
  property_title: string;
  status: string;
  cleaner_name?: string;
}

interface TodayWidgetProps {
  checkIns: TodayItem[];
  checkOuts: TodayItem[];
  cleaningTasks: CleaningItem[];
}

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  notified: "bg-blue-100 text-blue-800",
  in_progress: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
};

const TodayWidget = ({ checkIns, checkOuts, cleaningTasks }: TodayWidgetProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Check-ins */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LogIn className="h-4 w-4 text-green-600" />
            Check-ins Today ({checkIns.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checkIns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-ins today</p>
          ) : (
            checkIns.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">{item.guest_name}</span>
                  <p className="text-xs text-muted-foreground">{item.property_title}</p>
                </div>
                {item.time && <span className="text-xs text-muted-foreground">{item.time}</span>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Check-outs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LogOut className="h-4 w-4 text-orange-600" />
            Check-outs Today ({checkOuts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checkOuts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check-outs today</p>
          ) : (
            checkOuts.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">{item.guest_name}</span>
                  <p className="text-xs text-muted-foreground">{item.property_title}</p>
                </div>
                {item.time && <span className="text-xs text-muted-foreground">{item.time}</span>}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Cleaning Tasks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            Cleaning ({cleaningTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cleaningTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cleaning tasks today</p>
          ) : (
            cleaningTasks.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">{item.property_title}</span>
                  {item.cleaner_name && (
                    <p className="text-xs text-muted-foreground">{item.cleaner_name}</p>
                  )}
                </div>
                <Badge variant="outline" className={statusColor[item.status] || ""}>
                  {item.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TodayWidget;
