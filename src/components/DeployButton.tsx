import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Rocket, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

export const DeployButton = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleDeploy = async () => {
    setIsDeploying(true);
    
    try {
      // Simulate deployment process
      toast({
        title: 'Deployment Started',
        description: 'Building and deploying your application...',
      });

      // In a real scenario, this would trigger actual deployment
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setDeploymentStatus('success');
      toast({
        title: 'Deployment Successful!',
        description: 'Your application has been deployed successfully.',
      });
    } catch (error) {
      setDeploymentStatus('error');
      toast({
        title: 'Deployment Failed',
        description: 'There was an error deploying your application.',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const getStatusBadge = () => {
    switch (deploymentStatus) {
      case 'success':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Deployed
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            Deployment
          </span>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Deploy your application to production
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">Pre-deployment Checklist:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Menu items imported ✓</li>
            <li>• Recommendations configured ✓</li>
            <li>• AI suggestions working ✓</li>
            <li>• Analytics dashboard ready ✓</li>
            <li>• Admin roles configured ✓</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Smoke Test Guide:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>1. Sign up for a new account</li>
            <li>2. Browse menu and add items to cart</li>
            <li>3. View AI recommendations</li>
            <li>4. Complete checkout process</li>
            <li>5. Check order in admin analytics</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="flex-1"
          >
            {isDeploying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deploying...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Deploy to Production
              </>
            )}
          </Button>
          
          {deploymentStatus === 'success' && (
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Live
            </Button>
          )}
        </div>

        {deploymentStatus === 'success' && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              🎉 Your Food AI application is now live! Run the smoke test to ensure everything works correctly.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};