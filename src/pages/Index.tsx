import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">Welcome to FoodAI</h1>
        <p className="text-xl text-muted-foreground">Your AI-powered food recommendation system</p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link to="/settings">App Settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
