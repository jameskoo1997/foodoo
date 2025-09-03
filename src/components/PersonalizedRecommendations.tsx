import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePersonalizedRecommendations } from '@/hooks/usePersonalizedRecommendations';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, TrendingUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalizedRecommendationsProps {
  className?: string;
  variant?: 'menu' | 'cart';
}

export const PersonalizedRecommendations = ({ 
  className, 
  variant = 'menu' 
}: PersonalizedRecommendationsProps) => {
  const { recommendations, loading } = usePersonalizedRecommendations();
  const { addItem } = useCart();
  const { user } = useAuth();

  if (loading || recommendations.length === 0) return null;

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'history':
        return <Sparkles className="w-4 h-4" />;
      case 'popular':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const getReasonText = (reason: string) => {
    switch (reason) {
      case 'history':
        return 'Based on your orders';
      case 'popular':
        return 'Popular choice';
      default:
        return 'Recommended';
    }
  };

  const title = user ? 'Just for You' : 'Popular Choices';
  const description = user 
    ? 'Personalized recommendations based on your preferences'
    : 'Trending items other customers love';

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={cn(
          'grid gap-4',
          variant === 'menu' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex space-x-4 overflow-x-auto pb-2'
        )}>
          {recommendations.map(rec => (
            <div 
              key={rec.id} 
              className={cn(
                'p-3 bg-muted/50 rounded-lg space-y-3',
                variant === 'cart' && 'flex-shrink-0 w-48'
              )}
            >
              {rec.image_url && (
                <div className={cn(
                  'bg-background rounded-md overflow-hidden',
                  variant === 'menu' ? 'aspect-square' : 'w-full h-24'
                )}>
                  <img
                    src={rec.image_url}
                    alt={rec.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm leading-tight line-clamp-2">
                    {rec.name}
                  </h3>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    ${rec.price.toFixed(2)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getReasonIcon(rec.reason)}
                  <span>{getReasonText(rec.reason)}</span>
                </div>
                
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => addItem({
                    id: rec.id,
                    name: rec.name,
                    price: rec.price,
                    image_url: rec.image_url,
                  })}
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};