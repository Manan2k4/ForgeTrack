import React from 'react';

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
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

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-6">
          <div className="text-red-600 font-medium mb-2">Something went wrong while rendering this page.</div>
          <div className="text-sm text-muted-foreground">Please try a different tab or refresh the page.</div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default ErrorBoundary;
