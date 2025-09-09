import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold">Thingtrax</CardTitle>
          <CardDescription className="text-xl">
            Implementation Management Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Access your project dashboard and manage implementation tasks with ease.
          </p>
          <div className="space-y-3">
            <Button asChild size="lg" className="w-full">
              <Link to="/auth">Sign In to Dashboard</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Invite-only access. Contact your administrator if you need an account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
