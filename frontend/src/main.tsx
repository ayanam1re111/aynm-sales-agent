import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LangProvider } from './store/useLang'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>,
)
