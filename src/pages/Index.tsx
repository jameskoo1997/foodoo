import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { ShoppingBag, Utensils, Sparkles } from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Welcome to FoodAI
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover personalized food recommendations powered by AI. Order from our curated menu and enjoy intelligent suggestions based on your preferences.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center space-y-4 p-6 rounded-lg bg-card">
              <Utensils className="w-12 h-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Browse Menu</h3>
              <p className="text-muted-foreground">
                Explore our delicious selection of carefully crafted dishes
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-lg bg-card">
              <Sparkles className="w-12 h-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">AI Recommendations</h3>
              <p className="text-muted-foreground">
                Get personalized suggestions based on your order history
              </p>
            </div>
            
            <div className="text-center space-y-4 p-6 rounded-lg bg-card">
              <ShoppingBag className="w-12 h-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Easy Ordering</h3>
              <p className="text-muted-foreground">
                Simple and secure checkout with multiple payment options
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Button asChild size="lg" className="text-lg px-8">
              <Link to="/menu">
                <Utensils className="w-5 h-5 mr-2" />
                Browse Menu
              </Link>
            </Button>
            
            {user ? (
              <Button asChild variant="outline" size="lg" className="text-lg px-8">
                <Link to="/orders">View My Orders</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="lg" className="text-lg px-8">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
