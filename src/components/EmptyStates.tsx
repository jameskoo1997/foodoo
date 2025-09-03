import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Receipt, Search, Database } from 'lucide-react';

interface EmptyStateProps {
  type: 'cart' | 'orders' | 'menu' | 'search';
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export const EmptyState = ({ 
  type, 
  title, 
  description, 
  actionLabel, 
  actionHref, 
  onAction 
}: EmptyStateProps) => {
  const getIcon = () => {
    switch (type) {
      case 'cart':
        return <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />;
      case 'orders':
        return <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />;
      case 'search':
        return <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />;
      case 'menu':
        return <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />;
      default:
        return <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />;
    }
  };

  const getDefaultContent = () => {
    switch (type) {
      case 'cart':
        return {
          title: 'Your cart is empty',
          description: 'Looks like you haven\'t added anything to your cart yet. Browse our delicious menu to get started!',
          actionLabel: 'Browse Menu',
          actionHref: '/menu'
        };
      case 'orders':
        return {
          title: 'No orders yet',
          description: 'You haven\'t placed any orders yet. Start by browsing our menu and adding items to your cart.',
          actionLabel: 'Browse Menu',
          actionHref: '/menu'
        };
      case 'search':
        return {
          title: 'No items found',
          description: 'Try adjusting your search or filters to find what you\'re looking for.',
          actionLabel: 'Clear Filters',
        };
      case 'menu':
        return {
          title: 'Menu is empty',
          description: 'It looks like the menu is empty. Check back soon for delicious options!',
        };
      default:
        return {
          title: 'Nothing to show',
          description: 'There\'s nothing here right now.',
        };
    }
  };

  const defaultContent = getDefaultContent();
  const finalTitle = title || defaultContent.title;
  const finalDescription = description || defaultContent.description;
  const finalActionLabel = actionLabel || defaultContent.actionLabel;
  const finalActionHref = actionHref || defaultContent.actionHref;

  return (
    <Card>
      <CardContent className="py-12 text-center">
        {getIcon()}
        <CardTitle className="mb-2">{finalTitle}</CardTitle>
        <CardDescription className="mb-6 max-w-md mx-auto">
          {finalDescription}
        </CardDescription>
        {(finalActionLabel && (finalActionHref || onAction)) && (
          <Button 
            asChild={!!finalActionHref}
            onClick={onAction}
            variant={type === 'search' ? 'outline' : 'default'}
          >
            {finalActionHref ? (
              <a href={finalActionHref}>{finalActionLabel}</a>
            ) : (
              <span>{finalActionLabel}</span>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};