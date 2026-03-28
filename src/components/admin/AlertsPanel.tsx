import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";

interface AlertsPanelProps {
  syncFailures: number;
  doubleBookings: number;
  onViewSyncFailures?: () => void;
  onViewDoubleBookings?: () => void;
}

const AlertsPanel = ({
  syncFailures,
  doubleBookings,
  onViewSyncFailures,
  onViewDoubleBookings,
}: AlertsPanelProps) => {
  if (syncFailures === 0 && doubleBookings === 0) return null;

  return (
    <div className="space-y-3">
      {doubleBookings > 0 && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Double Booking Detected</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {doubleBookings} overlapping booking{doubleBookings > 1 ? "s" : ""} found.
              Immediate action required.
            </span>
            {onViewDoubleBookings && (
              <Button variant="outline" size="sm" onClick={onViewDoubleBookings}>
                View Conflicts
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {syncFailures > 0 && (
        <Alert variant="destructive" className="border-orange-300 bg-orange-50 text-orange-900">
          <RefreshCw className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">Calendar Sync Failed</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-orange-800">
            <span>
              {syncFailures} iCal feed{syncFailures > 1 ? "s" : ""} failed to sync.
              External bookings may not be reflected.
            </span>
            {onViewSyncFailures && (
              <Button variant="outline" size="sm" onClick={onViewSyncFailures}>
                View Feeds
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default AlertsPanel;
