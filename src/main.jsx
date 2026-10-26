import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/base.css';
import './styles/ui.css';
import './styles/games.css';
import './styles/jackpot.css';
import './styles/extras.css';

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
