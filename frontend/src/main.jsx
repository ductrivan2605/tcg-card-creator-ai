import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleResetStorage = () => {
    try {
      localStorage.removeItem("bunRealCua.v1");
    } catch (e) {
      console.warn("Could not clear localStorage:", e);
    }
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060c10",
          color: "#e6f0f5",
          fontFamily: "Inter, sans-serif",
          padding: 24,
          boxSizing: "border-box"
        }}>
          <div style={{
            maxWidth: 640,
            width: "100%",
            background: "#101a22",
            border: "1px solid #e07a7a",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)"
          }}>
            <h2 style={{ color: "#e07a7a", marginTop: 0, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
              ⚠️ Application Recovery
            </h2>
            <p style={{ fontSize: 13, color: "#9aaabb", lineHeight: 1.5, margin: "10px 0" }}>
              A rendering issue was caught:
            </p>
            <div style={{
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(224,122,122,0.3)",
              padding: 12,
              borderRadius: 6,
              fontSize: 12,
              color: "#ffb3b3",
              fontFamily: "monospace",
              marginBottom: 16,
              overflowX: "auto"
            }}>
              {this.state.error?.message || String(this.state.error)}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: "8px 16px",
                  background: "#67d9e6",
                  color: "#060c10",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleResetStorage}
                style={{
                  padding: "8px 16px",
                  background: "rgba(224,122,122,0.15)",
                  color: "#e07a7a",
                  border: "1px solid #e07a7a",
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                ↺ Clear Corrupted Local State & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
