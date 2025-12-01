import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  resetKeys?: any[];
  onReset?: () => void;
};
type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // eslint-disable-next-line no-console
    console.error('Admin UI ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (!arrayShallowEqual(prevProps.resetKeys, this.props.resetKeys)) {
      // Reset error state when reset keys change
      // eslint-disable-next-line no-console
      console.info('ErrorBoundary reset due to resetKeys change');
      this.setState({ hasError: false, error: undefined });
      this.props.onReset?.();
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-6">
          <div className="text-red-600 font-medium mb-2">Something went wrong while rendering this page.</div>
          <div className="text-sm text-muted-foreground mb-3">Please try a different tab or refresh the page.</div>
          {this.state.error?.message && (
            <div className="text-xs text-muted-foreground mb-3">Error: {String(this.state.error.message)}</div>
          )}
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default ErrorBoundary;

function arrayShallowEqual(a?: any[], b?: any[]) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
