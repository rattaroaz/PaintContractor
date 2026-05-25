import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  showDetails: boolean;
  lastKey: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
    showDetails: false,
    lastKey: "",
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    const key = `${error.name}:${error.message}`;
    return { hasError: true, message: error.message, lastKey: key };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  recover = () => {
    this.setState({
      hasError: false,
      message: "",
      showDetails: false,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5">
          <div className="card border-danger">
            <div className="card-body">
              <h4 className="card-title text-danger">
                ⚠ Something went wrong
              </h4>
              <p className="card-text">
                Please refresh the page or return to the dashboard. If the
                problem persists, contact support.
              </p>
              {this.state.showDetails && (
                <pre className="bg-light p-3 small text-danger">
                  {this.state.message}
                </pre>
              )}
              <div className="d-flex gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={this.recover}
                >
                  Try Again
                </button>
                <Link to="/" className="btn btn-outline-secondary">
                  Go to Dashboard
                </Link>
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() =>
                    this.setState((s) => ({
                      showDetails: !s.showDetails,
                    }))
                  }
                >
                  {this.state.showDetails ? "Hide Details" : "Show Details"}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
