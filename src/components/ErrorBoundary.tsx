import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Story Table render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center p-6">
          <div className="max-w-md story-card p-8 text-center space-y-4">
            <h1 className="text-xl font-semibold text-[#E8E9EB]">Algo salió mal</h1>
            <p className="text-sm text-[#8B91A7]">{this.state.error.message}</p>
            <button
              type="button"
              className="story-btn-primary mx-auto"
              onClick={() => {
                localStorage.removeItem('story-table-storage');
                window.location.reload();
              }}
            >
              Recargar app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
