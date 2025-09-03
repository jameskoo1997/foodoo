import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAnalytics } from '@/hooks/useAnalytics';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Target, RefreshCw, Calendar } from 'lucide-react';
import Header from '@/components/Header';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const Analytics = () => {
  const [dateRange, setDateRange] = useState('30');
  const { 
    kpis, 
    salesData, 
    categoryData, 
    paymentData, 
    topPairs, 
    discountUsage, 
    loading, 
    refreshAnalytics 
  } = useAnalytics(Number(dateRange));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Business insights and performance metrics</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={refreshAnalytics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Last {dateRange} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                Orders placed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.averageOrderValue)}</div>
              <p className="text-xs text-muted-foreground">
                Per order average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(kpis.conversionRate * 100)}</div>
              <p className="text-xs text-muted-foreground">
                Visits to orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales by Day */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Day</CardTitle>
              <CardDescription>Daily revenue and order count</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Orders'
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#82ca9d" name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Items Sold by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Items Sold by Category</CardTitle>
              <CardDescription>Category performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Items Sold'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="items_sold" fill="#8884d8" name="Items Sold" />
                  <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Payment Method Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Distribution</CardTitle>
              <CardDescription>How customers prefer to pay</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ method, percentage }) => `${method}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Item Pairs */}
          <Card>
            <CardHeader>
              <CardTitle>Top Item Pairs (MBA Rules)</CardTitle>
              <CardDescription>Most frequently bought together</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item A</TableHead>
                      <TableHead>Item B</TableHead>
                      <TableHead>Support</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Lift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPairs.map((pair, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{pair.item_a}</TableCell>
                        <TableCell>{pair.item_b}</TableCell>
                        <TableCell>{pair.support.toFixed(3)}</TableCell>
                        <TableCell>{pair.confidence.toFixed(3)}</TableCell>
                        <TableCell>{pair.lift.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Discount Usage Table */}
        <Card>
          <CardHeader>
            <CardTitle>Discount Usage Analysis</CardTitle>
            <CardDescription>Performance and impact of discount codes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Discount Code</TableHead>
                  <TableHead>Usage Count</TableHead>
                  <TableHead>Total Discount Given</TableHead>
                  <TableHead>Net Sales Impact</TableHead>
                  <TableHead>ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discountUsage.map((discount) => (
                  <TableRow key={discount.code}>
                    <TableCell className="font-medium">{discount.code}</TableCell>
                    <TableCell>{discount.usage_count}</TableCell>
                    <TableCell>{formatCurrency(discount.total_discount)}</TableCell>
                    <TableCell>{formatCurrency(discount.net_sales_impact)}</TableCell>
                    <TableCell>
                      {discount.total_discount > 0 
                        ? formatPercentage((discount.net_sales_impact / discount.total_discount - 1) * 100)
                        : 'N/A'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};