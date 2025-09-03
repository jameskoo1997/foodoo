import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const [openaiKey, setOpenaiKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveKeys = async () => {
    if (!openaiKey && !deepseekKey) {
      toast({
        title: "No keys provided",
        description: "Please enter at least one API key to save.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updates = [];

      if (openaiKey) {
        updates.push(
          supabase.functions.invoke('save-api-key', {
            body: { keyName: 'OPENAI_API_KEY', keyValue: openaiKey }
          })
        );
      }

      if (deepseekKey) {
        updates.push(
          supabase.functions.invoke('save-api-key', {
            body: { keyName: 'DEEPSEEK_API_KEY', keyValue: deepseekKey }
          })
        );
      }

      await Promise.all(updates);

      toast({
        title: "Keys saved successfully",
        description: "Your API keys have been stored securely and are available for server functions.",
      });

      // Clear the form
      setOpenaiKey("");
      setDeepseekKey("");
    } catch (error) {
      console.error('Error saving API keys:', error);
      toast({
        title: "Error saving keys",
        description: "There was a problem saving your API keys. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">App Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your API keys and application settings. All keys are stored securely and only accessible to server functions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Store your API keys securely. These will only be accessible to server-side functions and edge functions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for AI-powered features and content generation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deepseek-key">DeepSeek API Key</Label>
              <Input
                id="deepseek-key"
                type="password"
                placeholder="sk-..."
                value={deepseekKey}
                onChange={(e) => setDeepseekKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for advanced AI reasoning and analysis
              </p>
            </div>

            <Button 
              onClick={handleSaveKeys} 
              disabled={loading || (!openaiKey && !deepseekKey)}
              className="w-full"
            >
              {loading ? "Saving..." : "Save API Keys"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>🔒 Your API keys are encrypted and stored securely using Supabase's secrets management.</p>
              <p>🚫 Keys are never exposed to the frontend and are only accessible to server functions.</p>
              <p>✅ You can update or remove keys at any time by entering new values or clearing the fields.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;