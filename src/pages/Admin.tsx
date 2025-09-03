import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Upload, FileText, Check } from 'lucide-react';
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

      const { error } = await supabase
        .from('menu_items')
        .insert(menuItems);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Imported ${menuItems.length} menu items`,
      });

      setMenuFile(null);
      setMenuPreview([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to import menu items',
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
      toast({
        title: 'Error',
        description: 'Failed to import recommendations',
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