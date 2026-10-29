import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last-resort UI when a render throws. The happy path renders children unchanged.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      JSON.stringify({
        event: 'react_error',
        message: error.message,
        componentStack: info.componentStack,
      }),
    );
  }

  render(): React.ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-16">
        <h1 className="text-xl font-medium text-foreground">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          The page hit an unexpected error. Your repository data is still on the server.
        </p>
        <div>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
