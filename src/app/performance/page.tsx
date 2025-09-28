"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, Database, Zap, AlertTriangle } from "lucide-react";

interface PerformanceData {
  performanceMonitor: {
    totalQueries: number;
    totalErrors: number;
    errorRate: number;
    averageExecutionTime: number;
    uniqueQueries: number;
    slowQueries: number;
    topSlowQueries: Array<{
      queryName: string;
      averageTime: number;
      totalExecutions: number;
    }>;
  };
  queryAnalyzer: Array<{
    queryName: string;
    averageTime: number;
    totalExecutions: number;
    errorRate: number;
  }>;
}

interface QueueStatus {
  queue: {
    queueLength: number;
    processing: number;
    requestsThisMinute: number;
    rateLimitPerMinute: number;
  };
  system: {
    averageResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
    memoryUsage: number;
    activeUsers: number;
  };
  database: {
    current: number;
    max: number;
    utilization: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

export default function PerformancePage() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [perfResponse, queueResponse] = await Promise.all([
        fetch('/api/performance'),
        fetch('/api/queue-status')
      ]);

      if (perfResponse.ok) {
        const perfData = await perfResponse.json();
        setPerformanceData(perfData);
      }

      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        setQueueStatus(queueData);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return "bg-green-500";
    if (value <= thresholds.warning) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <p className="text-muted-foreground">
            {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Overview */}
      {queueStatus && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStatus.system.averageResponseTime}ms</div>
              <div className={`w-full h-2 rounded-full mt-2 ${getStatusColor(queueStatus.system.averageResponseTime, { good: 1000, warning: 3000 })}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(queueStatus.system.errorRate * 100).toFixed(1)}%</div>
              <div className={`w-full h-2 rounded-full mt-2 ${getStatusColor(queueStatus.system.errorRate * 100, { good: 2, warning: 5 })}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStatus.system.memoryUsage.toFixed(1)}MB</div>
              <div className={`w-full h-2 rounded-full mt-2 ${getStatusColor(queueStatus.system.memoryUsage, { good: 200, warning: 500 })}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">DB Connections</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStatus.database.current}/{queueStatus.database.max}</div>
              <div className="text-xs text-muted-foreground">{queueStatus.database.utilization.toFixed(1)}% used</div>
              <div className={`w-full h-2 rounded-full mt-2 ${getStatusColor(queueStatus.database.utilization, { good: 60, warning: 80 })}`} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queue Status */}
      {queueStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Queue Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Queue Length</div>
                <div className="text-2xl font-bold">{queueStatus.queue.queueLength}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Processing</div>
                <div className="text-2xl font-bold">{queueStatus.queue.processing}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Requests/Min</div>
                <div className="text-2xl font-bold">{queueStatus.queue.requestsThisMinute}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Users</div>
                <div className="text-2xl font-bold">{queueStatus.system.activeUsers}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Performance */}
      {queueStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Cache Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Hit Rate</div>
                <div className="text-2xl font-bold">{queueStatus.cache.hitRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Hits</div>
                <div className="text-2xl font-bold">{queueStatus.cache.hits}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Misses</div>
                <div className="text-2xl font-bold">{queueStatus.cache.misses}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Query Performance */}
      {performanceData && (
        <Card>
          <CardHeader>
            <CardTitle>Query Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-sm text-muted-foreground">Total Queries</div>
                <div className="text-2xl font-bold">{performanceData.performanceMonitor.totalQueries}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg Time</div>
                <div className="text-2xl font-bold">{performanceData.performanceMonitor.averageExecutionTime}ms</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Slow Queries</div>
                <div className="text-2xl font-bold">{performanceData.performanceMonitor.slowQueries}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Error Rate</div>
                <div className="text-2xl font-bold">{(performanceData.performanceMonitor.errorRate * 100).toFixed(1)}%</div>
              </div>
            </div>

            {performanceData.performanceMonitor.topSlowQueries.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Slowest Queries</h3>
                <div className="space-y-2">
                  {performanceData.performanceMonitor.topSlowQueries.map((query, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">{query.queryName}</div>
                        <div className="text-sm text-muted-foreground">{query.totalExecutions} executions</div>
                      </div>
                      <Badge variant={query.averageTime > 2000 ? "destructive" : query.averageTime > 1000 ? "secondary" : "default"}>
                        {query.averageTime}ms
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading performance data...
        </div>
      )}
    </div>
  );
}