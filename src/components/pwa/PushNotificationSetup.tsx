import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, TestTube } from "lucide-react";
import { usePushNotifications } from "@/pwa/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

export default function PushNotificationSetup() {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    requestPermission, 
    subscribe, 
    unsubscribe,
    sendTestNotification 
  } = usePushNotifications();
  
  const { toast } = useToast();

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      const subscription = await subscribe();
      if (subscription) {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive push notifications from Thingtrax.",
        });
      } else {
        toast({
          title: "Subscription Failed",
          description: "Failed to set up push notifications. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Permission Denied",
        description: "Please enable notifications in your browser settings.",
        variant: "destructive",
      });
    }
  };

  const handleDisableNotifications = async () => {
    const success = await unsubscribe();
    if (success) {
      toast({
        title: "Notifications Disabled",
        description: "You won't receive push notifications anymore.",
      });
    }
  };

  const handleTestNotification = () => {
    sendTestNotification();
    toast({
      title: "Test Sent",
      description: "Check if you received the test notification.",
    });
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default">Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      case 'default':
        return <Badge variant="secondary">Not Set</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about important updates and events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Permission Status:</span>
          {getPermissionBadge()}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">Subscription Status:</span>
          <Badge variant={isSubscribed ? "default" : "outline"}>
            {isSubscribed ? "Subscribed" : "Not Subscribed"}
          </Badge>
        </div>

        <div className="flex gap-2">
          {!isSubscribed ? (
            <Button 
              onClick={handleEnableNotifications}
              className="flex-1"
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
          ) : (
            <Button 
              onClick={handleDisableNotifications}
              variant="outline"
              className="flex-1"
            >
              <BellOff className="h-4 w-4 mr-2" />
              Disable Notifications
            </Button>
          )}
          
          {permission === 'granted' && (
            <Button 
              onClick={handleTestNotification}
              variant="secondary"
              size="sm"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}