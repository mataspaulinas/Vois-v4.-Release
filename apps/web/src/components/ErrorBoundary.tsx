import { Component, ErrorInfo, ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("OIS UI crashed:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell loading-screen fatal-screen">
          <div className="fatal-card">
            <p className="hero-badge">Frontend crash</p>
            <h1>UI runtime error</h1>
            <p className="hero-copy">{this.state.error.message}</p>
            <pre className="fatal-pre">{this.state.error.stack}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
