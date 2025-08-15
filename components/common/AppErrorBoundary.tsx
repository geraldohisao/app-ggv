import React from 'react';

type State = { hasError: boolean };

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // keep error logs minimal in prod; rely on monitoring if present
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
          Ocorreu um erro. Tente novamente.
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;


