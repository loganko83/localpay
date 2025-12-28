import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './common';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
                    <div className="max-w-md w-full">
                        <span className="material-symbols-outlined text-red-500 text-6xl mb-4">
                            error_outline
                        </span>
                        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                        <p className="text-text-secondary mb-6">
                            An unexpected error occurred. Our team has been notified.
                        </p>
                        {this.state.error && (
                            <div className="bg-surface-highlight rounded-xl p-4 mb-6 text-left overflow-auto max-h-32">
                                <code className="text-xs text-red-400">{this.state.error.message}</code>
                            </div>
                        )}
                        <Button variant="primary" fullWidth onClick={this.handleReset}>
                            Return to Home
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
