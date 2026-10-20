import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-xl bg-[#1c1414] border border-[#4d2828] text-[#fce7e7] flex flex-col items-center justify-center gap-3 my-2 text-center">
          <AlertTriangle className="w-8 h-8 text-[#f87171]" />
          <div>
            <h3 className="font-bold text-sm text-[#fca5a5]">
              {this.props.fallbackTitle || '表示中に一時的なエラーが発生しました'}
            </h3>
            <p className="text-xs text-[#d19b9b] mt-1 font-mono">
              {this.state.error?.message || '予期せぬエラー'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-3 py-1.5 rounded-lg bg-[#2e1d1d] hover:bg-[#3d2727] text-xs font-semibold text-[#fecaca] border border-[#633535] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>再試行</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
