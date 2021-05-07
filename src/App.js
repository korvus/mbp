import './style/App.css';
import React from 'react';
import Col from './components/menu.js';
import Map from './components/map.js';
import { PinContextProvider } from './store';

// Get coords : https://getlatlong.net/
// 2008 https://www.paris-bistro.com/cuisine/produits/ile-de-france/grand-prix-de-la-baguette-de-la-ville-de-paris-2008
// 2009

function App() {
  return (
    <PinContextProvider>
      <Col />
      <Map />
    </PinContextProvider>
  );
}

export default App;
