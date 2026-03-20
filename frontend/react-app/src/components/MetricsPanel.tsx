import { useEffect, useState } from "react";

function MetricsPanel() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/metrics/overview", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("API failed");
        }
        return res.json();
      })
      .then(setMetrics)
      .catch((err) => {
        console.error("Metrics error:", err);
      });
  }, []);

  if (!metrics) return <div className="text-white">Loading metrics...</div>;

  return (
    <div className="p-4 bg-gray-900 rounded-xl text-white">
      <h2 className="text-lg font-bold mb-2">System Metrics</h2>

      <p>Total Queries: {metrics.total_queries}</p>
      <p>Avg Latency: {metrics.avg_latency_ms} ms</p>
      <p>Avg Results: {metrics.avg_results}</p>
    </div>
  );
}

export default MetricsPanel;