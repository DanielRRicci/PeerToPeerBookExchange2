import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("Loading...");
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetch(`${apiBase}/health`)
      .then((r) => r.json())
      .then((data) => setStatus(data.message))
      .catch(() => setStatus("Backend not reachable"));
  }, [apiBase]);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Peer-to-Peer Book Exchange</h1>
      <p><strong>API Base:</strong> {apiBase}</p>
      <p><strong>API Status:</strong> {status}</p>
    </div>
  );
}
