import React from 'react';
import { WifiOff, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
}

// Wraps a Suspense boundary around a lazy-loaded (code-split) module, such
// as the 3D exam management view. lazyWithRetry already retries a failed
// chunk download a few times on its own, so this only shows up after a
// genuinely sustained slow/dropped connection — with a clear message and a
// one-tap retry instead of a silently blank screen.
export class LazyLoadErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Lazy-loaded module failed to load (likely a slow/unstable connection):', error);
  }

  handleRetry = () => {
    // The failed dynamic import's promise is cached forever inside the
    // lazy() wrapper, so a bare state reset won't trigger a fresh fetch —
    // a full reload is the reliable way to try the chunk again.
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
          <WifiOff className="w-8 h-8 text-amber-500" />
          <div className="text-sm font-bold text-slate-700 max-w-sm">
            Couldn't load {this.props.label || 'this section'} — your connection may be slow or unstable.
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
