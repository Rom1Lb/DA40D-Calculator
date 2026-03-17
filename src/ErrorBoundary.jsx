import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  componentDidCatch(error, info) {
    this.setState({ error, info })
    console.error('React crash:', error)
    console.error('Component stack:', info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '40px',
          fontFamily: 'monospace',
          background: '#0d1117',
          color: '#f85149',
          minHeight: '100vh',
        }}>
          <h1 style={{ fontSize: 18, marginBottom: 16, color: '#e6edf3' }}>
            Application error — check browser console (F12)
          </h1>
          <pre style={{
            background: '#161b22',
            padding: 20,
            borderRadius: 8,
            fontSize: 13,
            color: '#f85149',
            overflow: 'auto',
            border: '1px solid #30363d',
          }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.info?.componentStack}
          </pre>
          <button
            onClick={() => this.setState({ error: null, info: null })}
            style={{
              marginTop: 20,
              padding: '8px 16px',
              background: '#58a6ff',
              border: 'none',
              borderRadius: 6,
              color: '#0d1117',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
