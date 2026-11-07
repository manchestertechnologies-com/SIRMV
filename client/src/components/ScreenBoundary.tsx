import React from 'react';
import { clearAllState } from '../academic/persist';

// If one screen fails to draw, show a way out instead of a blank page.
interface Props { children: React.ReactNode; onHome: () => void }
export class ScreenBoundary extends React.Component<Props, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(e: unknown) { console.error('Screen failed to draw', e); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-base font-semibold text-slate-800">This screen could not open.</p>
        <p className="text-sm text-slate-500">Your saved place may be out of date. Go to the dashboard to start fresh.</p>
        <button onClick={() => { clearAllState(); this.setState({ error: false }); this.props.onHome(); }} className="px-5 py-2.5 rounded-xl bg-[#a3161b] text-white text-sm font-semibold">Go to dashboard</button>
      </div>
    );
  }
}
