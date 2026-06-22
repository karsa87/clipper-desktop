import { Component, type ReactNode } from 'react'
import { Button } from './button'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => this.setState({ hasError: false })}>
          Try again
        </Button>
      </div>
    )
  }
}
