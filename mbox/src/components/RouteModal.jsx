import React from 'react';

function RouteModal({ destination, userLocation, onConfirm, onCancel }) {
  if (!destination || !userLocation) return null;

  return (
    <div
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-5 rounded-lg z-50 shadow-xl"
    >
      <h3 className="text-xl font-semibold">¿Quieres ir a esta ubicación?</h3>
      <p className="mt-2">Latitud: {destination.lat}, Longitud: {destination.lng}</p>
      <div className="mt-4 flex gap-4">
        <button
          onClick={onConfirm}
          className="bg-green-500 text-white p-2 rounded"
        >
          Sí, ir allí
        </button>
        <button
          onClick={onCancel}
          className="bg-red-500 text-white p-2 rounded"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default RouteModal;
