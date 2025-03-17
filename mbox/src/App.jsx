// App.jsx
import React from 'react';
import MapView from './components/MapView';
import './App.css'

function App() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center', // Centra horizontalmente
        alignItems: 'center', // Centra verticalmente
        height: 'fit-content', // Asegura que ocupe toda la altura de la pantalla
        margin: 0, // Elimina márgenes por defecto
        backgroundColor: '#000',
      }}
    >
      <MapView />
    </div>
  );
}

export default App;
