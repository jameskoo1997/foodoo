-- Create user_secrets table for storing API keys securely
CREATE TABLE public.user_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  key_name TEXT NOT NULL,
  key_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, key_name)
);

-- Enable Row Level Security
ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_secrets
CREATE POLICY "Users can only access their own secrets" 
ON public.user_secrets 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_secrets_updated_at
  BEFORE UPDATE ON public.user_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();