import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from './store/store'
import './index.css'
import App from './App.tsx'
import PersistentLogin from './components/PersistentLogin.tsx'
import LoadingOverlay from './components/LoadingOverlay.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <LoadingOverlay />
        <PersistentLogin>
          <App />
        </PersistentLogin>
      </Provider>
    </BrowserRouter>
  </StrictMode>,
)
