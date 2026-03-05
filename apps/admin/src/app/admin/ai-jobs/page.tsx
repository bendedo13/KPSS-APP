"use client";

import { useEffect, useState, useCallback } from "react";
import { AIJob, getAIJobs, acceptJob, rejectJob } from "@/lib/api";

interface Toast {
  message: string;
  type: "success" | "error";
}

export default function AIJobsPage() {
  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: Toast["type"]) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAIJobs("pending_review");
      setJobs(data);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to load jobs",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleAccept = async (id: string) => {
    setProcessingId(id);
    try {
      await acceptJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      showToast("Question accepted", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Accept failed",
        "error",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectJob(id, rejectReason || undefined);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setRejectingId(null);
      setRejectReason("");
      showToast("Question rejected", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Reject failed",
        "error",
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            padding: "12px 20px",
            borderRadius: "6px",
            color: "#fff",
            backgroundColor: toast.type === "success" ? "#16a34a" : "#dc2626",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toast.message}
        </div>
      )}

      <h2 style={{ marginTop: 0 }}>AI-Generated Questions — Review</h2>

      {loading ? (
        <p>Loading…</p>
      ) : jobs.length === 0 ? (
        <p style={{ color: "#64748b" }}>
          No questions pending review.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "#fff",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", textAlign: "left" }}>
              <th style={thStyle}>Question</th>
              <th style={thStyle}>Topic</th>
              <th style={thStyle}>Difficulty</th>
              <th style={thStyle}>Confidence</th>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td style={tdStyle}>
                  {job.text.length > 120
                    ? `${job.text.slice(0, 120)}…`
                    : job.text}
                </td>
                <td style={tdStyle}>{job.topic}</td>
                <td style={tdStyle}>{job.difficulty}</td>
                <td style={tdStyle}>
                  {(job.confidence * 100).toFixed(0)}%
                </td>
                <td style={tdStyle}>{job.source}</td>
                <td style={{ ...tdStyle, minWidth: "180px" }}>
                  {rejectingId === job.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <input
                        type="text"
                        placeholder="Rejection reason (optional)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        style={{
                          padding: "4px 8px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                        }}
                      />
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => handleReject(job.id)}
                          disabled={processingId === job.id}
                          style={{ ...btnStyle, backgroundColor: "#dc2626", color: "#fff" }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                          style={btnStyle}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => handleAccept(job.id)}
                        disabled={processingId === job.id}
                        style={{ ...btnStyle, backgroundColor: "#16a34a", color: "#fff" }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setRejectingId(job.id)}
                        disabled={processingId === job.id}
                        style={{ ...btnStyle, backgroundColor: "#ef4444", color: "#fff" }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#475569",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "0.9rem",
  verticalAlign: "top",
};

const btnStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.85rem",
  backgroundColor: "#f1f5f9",
};
