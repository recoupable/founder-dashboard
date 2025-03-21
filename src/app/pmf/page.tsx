'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Sample data - in a real app, this would come from your database
const pmfSurveyData = [
  { month: 'Jan', veryDisappointed: 15, somewhatDisappointed: 25, notDisappointed: 60, total: 100 },
  { month: 'Feb', veryDisappointed: 12, somewhatDisappointed: 28, notDisappointed: 65, total: 105 },
  { month: 'Mar', veryDisappointed: 10, somewhatDisappointed: 20, notDisappointed: 75, total: 105 },
  { month: 'Apr', veryDisappointed: 8, somewhatDisappointed: 17, notDisappointed: 85, total: 110 },
];

const latestSurveyData = pmfSurveyData[pmfSurveyData.length - 1];
const veryDisappointedPercentage = Math.round((latestSurveyData.veryDisappointed / latestSurveyData.total) * 100);

const pieData = [
  { name: 'Very Disappointed', value: latestSurveyData.veryDisappointed },
  { name: 'Somewhat Disappointed', value: latestSurveyData.somewhatDisappointed },
  { name: 'Not Disappointed', value: latestSurveyData.notDisappointed },
];

const COLORS = ['#FF8042', '#FFBB28', '#00C49F'];

// Sample feature request data
const featureRequestData = [
  { feature: 'Better Analytics', count: 45 },
  { feature: 'Mobile App', count: 38 },
  { feature: 'API Access', count: 32 },
  { feature: 'Team Collaboration', count: 27 },
  { feature: 'Custom Reports', count: 21 },
];

// Sample user segments data
const userSegmentsData = [
  { segment: 'Enterprise', veryDisappointed: 5, somewhatDisappointed: 10, notDisappointed: 35 },
  { segment: 'Mid-Market', veryDisappointed: 3, somewhatDisappointed: 7, notDisappointed: 25 },
  { segment: 'Small Business', veryDisappointed: 2, somewhatDisappointed: 3, notDisappointed: 15 },
];

export default function PMFPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Product-Market Fit</h1>
        <div className="text-sm text-muted-foreground mt-2 sm:mt-0">
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segments">User Segments</TabsTrigger>
          <TabsTrigger value="features">Feature Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  PMF Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{veryDisappointedPercentage}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {veryDisappointedPercentage >= 40 
                    ? "You've achieved Product-Market Fit! 🎉" 
                    : "Working towards Product-Market Fit"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Survey Responses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{latestSurveyData.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total responses this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Response Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">42%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Of users completed the survey
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Disappointment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PMF Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={pmfSurveyData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="veryDisappointed" stackId="a" fill="#FF8042" name="Very Disappointed" />
                    <Bar dataKey="somewhatDisappointed" stackId="a" fill="#FFBB28" name="Somewhat Disappointed" />
                    <Bar dataKey="notDisappointed" stackId="a" fill="#00C49F" name="Not Disappointed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="segments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PMF by User Segment</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={userSegmentsData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="segment" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="veryDisappointed" stackId="a" fill="#FF8042" name="Very Disappointed" />
                  <Bar dataKey="somewhatDisappointed" stackId="a" fill="#FFBB28" name="Somewhat Disappointed" />
                  <Bar dataKey="notDisappointed" stackId="a" fill="#00C49F" name="Not Disappointed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Enterprise PMF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.round((userSegmentsData[0].veryDisappointed / 
                    (userSegmentsData[0].veryDisappointed + 
                     userSegmentsData[0].somewhatDisappointed + 
                     userSegmentsData[0].notDisappointed)) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Very disappointed if removed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Mid-Market PMF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.round((userSegmentsData[1].veryDisappointed / 
                    (userSegmentsData[1].veryDisappointed + 
                     userSegmentsData[1].somewhatDisappointed + 
                     userSegmentsData[1].notDisappointed)) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Very disappointed if removed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Small Business PMF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {Math.round((userSegmentsData[2].veryDisappointed / 
                    (userSegmentsData[2].veryDisappointed + 
                     userSegmentsData[2].somewhatDisappointed + 
                     userSegmentsData[2].notDisappointed)) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Very disappointed if removed
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Feature Requests</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={featureRequestData}
                  layout="vertical"
                  margin={{
                    top: 20,
                    right: 30,
                    left: 100,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="feature" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="Request Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Request Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Feature</th>
                        <th className="text-left py-3 px-4">Count</th>
                        <th className="text-left py-3 px-4">Segment</th>
                        <th className="text-left py-3 px-4">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4">Better Analytics</td>
                        <td className="py-3 px-4">45</td>
                        <td className="py-3 px-4">Enterprise</td>
                        <td className="py-3 px-4">
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">High</span>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">Mobile App</td>
                        <td className="py-3 px-4">38</td>
                        <td className="py-3 px-4">Mid-Market</td>
                        <td className="py-3 px-4">
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Medium</span>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">API Access</td>
                        <td className="py-3 px-4">32</td>
                        <td className="py-3 px-4">Enterprise</td>
                        <td className="py-3 px-4">
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">High</span>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4">Team Collaboration</td>
                        <td className="py-3 px-4">27</td>
                        <td className="py-3 px-4">Mid-Market</td>
                        <td className="py-3 px-4">
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Medium</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">Custom Reports</td>
                        <td className="py-3 px-4">21</td>
                        <td className="py-3 px-4">Small Business</td>
                        <td className="py-3 px-4">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Low</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 