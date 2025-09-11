import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThingtraxLogo } from '@/components/ThingtraxLogo';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-thingtrax-subtle p-4">
      <Card className="w-full max-w-lg text-center shadow-premium border-thingtrax-blue/10">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <ThingtraxLogo size="xl" />
          </div>
          <CardDescription className="text-big text-thingtrax-dark-gray">
            Implementation Management Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <p className="text-medium text-thingtrax-gray leading-relaxed">
            Access your project dashboard and manage implementation tasks with ease.
          </p>
          <div className="space-y-4">
            <Button asChild variant="thingtrax" size="big" className="w-full">
              <Link to="/auth">Sign In to Dashboard</Link>
            </Button>
            <p className="text-small text-thingtrax-gray">
              Invite-only access. Contact your administrator if you need an account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;