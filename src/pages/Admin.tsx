import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { DeployButton } from '@/components/DeployButton';
import { Upload, FileText, Database, Sparkles } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface MenuItem {
  name: string;
  description: string;
  category: string;
  price: number;
  image_url?: string;
}

interface Recommendation {
  base_item_name: string;
  recommended_item_name: string;
  confidence: number;
  lift: number;
  support: number;
}

export const Admin = () => {
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [recommendationsFile, setRecommendationsFile] = useState<File | null>(null);
  const [menuPreview, setMenuPreview] = useState<MenuItem[]>([]);
  const [recommendationsPreview, setRecommendationsPreview] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const { toast } = useToast();

  const parseCSV = (text: string): string[][] => {
    const rows = text.split('\n').filter(row => row.trim());
    return rows.map(row => {
      const cells = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells;
    });
  };

  const handleMenuFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMenuFile(file);
    const text = await file.text();
    const rows = parseCSV(text);
    
    if (rows.length < 2) {
      toast({ title: 'Error', description: 'CSV file must have a header row and at least one data row', variant: 'destructive' });
      return;
    }

    const [header, ...dataRows] = rows;
    const preview = dataRows.slice(0, 5).map(row => ({
      name: row[0] || '',
      description: row[1] || '',
      category: row[2] || '',
      price: parseFloat(row[3]) || 0,
      image_url: row[4] || undefined,
    }));

    setMenuPreview(preview);
  };

  const handleRecommendationsFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRecommendationsFile(file);
    const text = await file.text();
    const rows = parseCSV(text);
    
    if (rows.length < 2) {
      toast({ title: 'Error', description: 'CSV file must have a header row and at least one data row', variant: 'destructive' });
      return;
    }

    const [header, ...dataRows] = rows;
    const preview = dataRows.slice(0, 5).map(row => ({
      base_item_name: row[0] || '',
      recommended_item_name: row[1] || '',
      confidence: parseFloat(row[2]) || 0,
      lift: parseFloat(row[3]) || 0,
      support: parseFloat(row[4]) || 0,
    }));

    setRecommendationsPreview(preview);
  };

  const importMenuItems = async () => {
    if (!menuFile) return;

    setLoading(true);
    try {
      const text = await menuFile.text();
      const rows = parseCSV(text);
      const [header, ...dataRows] = rows;

      const menuItems = dataRows.map(row => ({
        name: row[0],
        description: row[1],
        category: row[2],
        price: parseFloat(row[3]),
        image_url: row[4] || null,
        is_active: true,
      }));

      console.log('Attempting to insert menu items:', menuItems);
      
      const { error } = await supabase
        .from('menu_items')
        .insert(menuItems);

      if (error) {
        console.error('Supabase insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Database error: ${error.message}`);
      }

      toast({
        title: 'Success',
        description: `Imported ${menuItems.length} menu items`,
      });

      setMenuFile(null);
      setMenuPreview([]);
    } catch (error) {
      console.error('Import error details:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import menu items. Please check the file format and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const importRecommendations = async () => {
    if (!recommendationsFile) return;

    setLoading(true);
    try {
      const text = await recommendationsFile.text();
      const rows = parseCSV(text);
      const [header, ...dataRows] = rows;

      // Get all menu items to map names to IDs
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name');

      if (menuError) throw menuError;

      const nameToId = new Map(menuItems.map(item => [item.name.toLowerCase(), item.id]));

      const recommendations = dataRows
        .map(row => {
          const baseItemId = nameToId.get(row[0].toLowerCase());
          const recommendedItemId = nameToId.get(row[1].toLowerCase());
          
          if (!baseItemId || !recommendedItemId) return null;
          
          return {
            item_id: baseItemId,
            recommended_item_id: recommendedItemId,
            confidence: parseFloat(row[2]),
            lift: parseFloat(row[3]),
            support: parseFloat(row[4]),
          };
        })
        .filter(Boolean);

      const { error } = await supabase
        .from('recommendations')
        .insert(recommendations);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Imported ${recommendations.length} recommendations`,
      });

      setRecommendationsFile(null);
      setRecommendationsPreview([]);
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: 'Failed to import recommendations. Please check the file format and item names.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const seedDemoData = async () => {
    setLoading(true);
    try {
      // Demo menu items (20 items)
      const demoMenuItems = [
        { name: 'Classic Margherita Pizza', description: 'Fresh mozzarella, tomatoes, and basil on our signature crust', category: 'Pizza', price: 16.99, image_url: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400' },
        { name: 'Pepperoni Supreme', description: 'Premium pepperoni with extra cheese and our special sauce', category: 'Pizza', price: 18.99, image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400' },
        { name: 'Grilled Chicken Caesar', description: 'Crisp romaine, grilled chicken, parmesan, and house-made croutons', category: 'Salads', price: 14.99, image_url: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400' },
        { name: 'Mediterranean Bowl', description: 'Quinoa, olives, feta cheese, cucumbers, and tahini dressing', category: 'Salads', price: 13.99, image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
        { name: 'Angus Beef Burger', description: 'Premium beef patty with lettuce, tomato, cheese, and bacon', category: 'Burgers', price: 17.99, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
        { name: 'Veggie Burger Deluxe', description: 'Plant-based patty with avocado, sprouts, and chipotle mayo', category: 'Burgers', price: 15.99, image_url: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400' },
        { name: 'Atlantic Salmon', description: 'Grilled salmon with herb butter and seasonal vegetables', category: 'Seafood', price: 24.99, image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400' },
        { name: 'Fish & Chips', description: 'Beer-battered cod with crispy fries and tartar sauce', category: 'Seafood', price: 19.99, image_url: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400' },
        { name: 'Chicken Pad Thai', description: 'Traditional Thai noodles with chicken, bean sprouts, and peanuts', category: 'Asian', price: 16.99, image_url: 'https://images.unsplash.com/photo-1559314809-0f31657da5d6?w=400' },
        { name: 'Beef Teriyaki Bowl', description: 'Tender beef with steamed rice and stir-fried vegetables', category: 'Asian', price: 18.99, image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400' },
        { name: 'BBQ Ribs Platter', description: 'Fall-off-the-bone ribs with our signature BBQ sauce', category: 'BBQ', price: 26.99, image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400' },
        { name: 'Pulled Pork Sandwich', description: 'Slow-cooked pulled pork with coleslaw on brioche bun', category: 'BBQ', price: 14.99, image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433a?w=400' },
        { name: 'Mushroom Risotto', description: 'Creamy arborio rice with wild mushrooms and truffle oil', category: 'Italian', price: 19.99, image_url: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400' },
        { name: 'Chicken Parmigiana', description: 'Breaded chicken breast with marinara and melted mozzarella', category: 'Italian', price: 21.99, image_url: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400' },
        { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center and vanilla ice cream', category: 'Desserts', price: 8.99, image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400' },
        { name: 'New York Cheesecake', description: 'Classic cheesecake with graham cracker crust and berry compote', category: 'Desserts', price: 7.99, image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400' },
        { name: 'Craft Beer Selection', description: 'Rotating selection of local and imported craft beers', category: 'Beverages', price: 6.99, image_url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400' },
        { name: 'Fresh Fruit Smoothie', description: 'Blended seasonal fruits with yogurt and honey', category: 'Beverages', price: 5.99, image_url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400' },
        { name: 'Artisan Coffee', description: 'Single-origin coffee beans roasted to perfection', category: 'Beverages', price: 3.99, image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400' },
        { name: 'Seasonal Soup', description: 'Chef-selected seasonal soup made fresh daily', category: 'Appetizers', price: 6.99, image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400' }
      ];

      // Insert menu items
      const { data: insertedItems, error: menuError } = await supabase
        .from('menu_items')
        .insert(demoMenuItems.map(item => ({ ...item, is_active: true })))
        .select('id, name');

      if (menuError) throw menuError;

      // Create sample recommendations between items
      if (insertedItems && insertedItems.length >= 10) {
        const recommendations = [];
        for (let i = 0; i < Math.min(50, insertedItems.length * 2); i++) {
          const baseIndex = Math.floor(Math.random() * insertedItems.length);
          let recommendedIndex = Math.floor(Math.random() * insertedItems.length);
          
          // Ensure different items
          while (recommendedIndex === baseIndex) {
            recommendedIndex = Math.floor(Math.random() * insertedItems.length);
          }
          
          recommendations.push({
            item_id: insertedItems[baseIndex].id,
            recommended_item_id: insertedItems[recommendedIndex].id,
            confidence: Math.random() * 0.8 + 0.2, // 0.2 to 1.0
            lift: Math.random() * 2 + 1, // 1.0 to 3.0
            support: Math.random() * 0.3 + 0.05, // 0.05 to 0.35
          });
        }

        const { error: recError } = await supabase
          .from('recommendations')
          .insert(recommendations);

        if (recError) throw recError;
      }

      // Create sample orders (simplified version)
      const sampleUsers = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const orders = [];
      
      for (let i = 0; i < 25; i++) { // Create 25 sample orders
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 30)); // Last 30 days
        
        const subtotal = Math.random() * 80 + 20; // $20-$100
        const discountAmount = Math.random() > 0.7 ? Math.random() * 10 : 0; // 30% chance of discount
        
        orders.push({
          subtotal,
          discount_amount: discountAmount,
          total: subtotal - discountAmount,
          status: Math.random() > 0.1 ? 'completed' : 'pending',
          created_at: orderDate.toISOString(),
        });
      }

      const { error: orderError } = await supabase
        .from('orders')
        .insert(orders);

      if (orderError) throw orderError;

      toast({
        title: 'Demo Data Created!',
        description: `Successfully created ${demoMenuItems.length} menu items, ${Math.min(50, insertedItems?.length * 2 || 0)} recommendations, and ${orders.length} sample orders.`,
      });

    } catch (error) {
      console.error('Demo data error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create demo data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin - Data Import</h1>
        
        {/* Demo Mode Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Demo Mode
            </CardTitle>
            <CardDescription>
              Quickly populate your database with sample data for testing and demonstrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="demo-mode"
                checked={demoMode}
                onCheckedChange={setDemoMode}
              />
              <Label htmlFor="demo-mode">Enable Demo Mode</Label>
            </div>
            
            {demoMode && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <p className="text-sm text-muted-foreground">
                  Demo mode will create:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• 20 diverse menu items across 8 categories</li>
                  <li>• 50 recommendation pairs for MBA analysis</li>
                  <li>• 25 sample orders with realistic data</li>
                  <li>• Sample discount usage and analytics data</li>
                </ul>
                
                <Button
                  onClick={seedDemoData}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Creating Demo Data...' : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Demo Data
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator className="my-8" />
        
        {/* Deployment Section */}
        <DeployButton />
        
        <Separator className="my-8" />
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Menu Items Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Menu Items Import
              </CardTitle>
              <CardDescription>
                Upload a CSV file with columns: name, description, category, price, image_url
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="menu-file">CSV File</Label>
                <Input
                  id="menu-file"
                  type="file"
                  accept=".csv"
                  onChange={handleMenuFileChange}
                  className="mt-1"
                />
              </div>
              
              {menuPreview.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Preview (first 5 rows):</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {menuPreview.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="max-w-32 truncate">{item.description}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>${item.price.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <Button
                onClick={importMenuItems}
                disabled={!menuFile || loading}
                className="w-full"
              >
                {loading ? 'Importing...' : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Menu Items
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recommendations Import */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recommendations Import
              </CardTitle>
              <CardDescription>
                Upload a CSV file with columns: base_item_name, recommended_item_name, confidence, lift, support
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recommendations-file">CSV File</Label>
                <Input
                  id="recommendations-file"
                  type="file"
                  accept=".csv"
                  onChange={handleRecommendationsFileChange}
                  className="mt-1"
                />
              </div>
              
              {recommendationsPreview.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Preview (first 5 rows):</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Base Item</TableHead>
                        <TableHead>Recommended</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Support</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recommendationsPreview.map((rec, index) => (
                        <TableRow key={index}>
                          <TableCell className="max-w-20 truncate">{rec.base_item_name}</TableCell>
                          <TableCell className="max-w-20 truncate">{rec.recommended_item_name}</TableCell>
                          <TableCell>{rec.confidence.toFixed(2)}</TableCell>
                          <TableCell>{rec.support.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <Button
                onClick={importRecommendations}
                disabled={!recommendationsFile || loading}
                className="w-full"
              >
                {loading ? 'Importing...' : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Recommendations
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};