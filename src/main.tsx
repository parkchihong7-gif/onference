import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './store'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

const saved = localStorage.getItem('onference.theme')
if (saved) document.documentElement.dataset.theme = saved

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
)
