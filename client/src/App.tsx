import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { SocketProvider } from './SocketContext';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Auction from './pages/Auction';
import Summary from './pages/Summary';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby/:roomCode" element={<Lobby />} />
            <Route path="/auction/:roomCode" element={<Auction />} />
            <Route path="/summary/:roomCode" element={<Summary />} />
          </Routes>
          <Toaster position="top-right" />
        </SocketProvider>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
