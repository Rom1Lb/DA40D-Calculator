import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
