import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Catches render errors so a bad template/state never white-screens the app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('CVAurum error boundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              An unexpected error occurred. Your resumes are saved locally and are safe.
            </p>
            {this.state.error.message && (
              <pre className="mx-auto mt-3 max-w-md overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => this.setState({ error: null })}>
              Try again
            </button>
            <a className="btn-primary" href="/app">
              Back to resumes
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
