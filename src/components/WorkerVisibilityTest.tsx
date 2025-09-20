import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const WorkerVisibilityTest = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setUserInfo({ user, profile });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const runTests = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test 1: Check if user can see their own reports
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .limit(5);
      
      results.push({
        test: 'Reports Access',
        success: !reportsError,
        data: reports,
        error: reportsError?.message
      });

      // Test 2: Check worker table access
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('*')
        .limit(5);
      
      results.push({
        test: 'Workers Access',
        success: !workersError,
        data: workers,
        error: workersError?.message
      });

      // Test 3: Check specific worker fetch (simulate report detail)
      if (reports && reports.length > 0) {
        const reportWithWorker = reports.find(r => r.assigned_worker_id);
        if (reportWithWorker) {
          const { data: specificWorker, error: specificWorkerError } = await supabase
            .from('workers')
            .select('id, full_name, email, phone, specialty')
            .eq('id', reportWithWorker.assigned_worker_id)
            .single();
          
          results.push({
            test: 'Specific Worker Fetch',
            success: !specificWorkerError,
            data: specificWorker,
            error: specificWorkerError?.message,
            reportId: reportWithWorker.id
          });
        }
      }

      // Test 4: Check reports with worker join
      const { data: reportsWithWorkers, error: joinError } = await supabase
        .from('reports')
        .select(`
          *,
          workers:assigned_worker_id (
            id,
            full_name,
            email,
            phone,
            specialty
          )
        `)
        .limit(3);
      
      results.push({
        test: 'Reports with Worker Join',
        success: !joinError,
        data: reportsWithWorkers,
        error: joinError?.message
      });

      setTestResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Worker Visibility Debug Tool</CardTitle>
          <CardDescription>
            This tool helps debug worker information visibility issues for citizens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Current User Info:</h3>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(userInfo, null, 2)}
            </pre>
          </div>
          
          <Button onClick={runTests} disabled={loading}>
            {loading ? 'Running Tests...' : 'Run Visibility Tests'}
          </Button>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Test Results</h2>
          {testResults.map((result, index) => (
            <Card key={index} className={result.success ? 'border-green-200' : 'border-red-200'}>
              <CardHeader>
                <CardTitle className={result.success ? 'text-green-700' : 'text-red-700'}>
                  {result.test} - {result.success ? 'PASSED' : 'FAILED'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.error && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-red-600 mb-2">Error:</h4>
                    <p className="text-red-600 text-sm">{result.error}</p>
                  </div>
                )}
                
                {result.data && (
                  <div>
                    <h4 className="font-semibold mb-2">Data:</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
                
                {result.reportId && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Report ID: {result.reportId}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerVisibilityTest;