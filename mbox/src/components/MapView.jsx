import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import RouteModal from './RouteModal'; // Importa el modal
import axios from 'axios'; // Para hacer peticiones a la API

function MapView() {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nearestStop, setNearestStop] = useState(null); // Guardamos la parada más cercana

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoibmVvZGV2IiwiYSI6ImNtOGQ4ZmIxMzBtc2kybHBzdzNxa3U4eDcifQ.1Oa8lXU045VvFUul26Kwkg';

    const initialMap = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11', // Estilo más amigable
      center: [-74.0242, 40.6941], // Coordenadas iniciales
      zoom: 14,
    });

    setMap(initialMap);

    initialMap.on('click', (e) => {
      setDestination(e.lngLat); // Establece el destino con la ubicación clickeada
      setIsModalOpen(true); // Muestra el modal
    });

    return () => {
      if (initialMap) {
        initialMap.remove();
      }
    };
  }, []);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });

          if (map) {
            map.flyTo({
              center: [longitude, latitude],
              zoom: 14, // Zoom al nivel más cercano
            });

            // Crear un marcador para mostrar la ubicación
            new mapboxgl.Marker()
              .setLngLat([longitude, latitude])
              .addTo(map);
          }
        },
        (error) => {
          console.error('Error al obtener la ubicación:', error);
        }
      );
    } else {
      console.error('Geolocalización no está soportada en este navegador.');
    }
  };

  const handleModalConfirm = () => {
    if (userLocation && destination) {
      // Calcular la ruta usando Mapbox Directions API
      const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.longitude},${userLocation.latitude};${destination.lng},${destination.lat}?alternatives=true&geometries=geojson&steps=true&access_token=${mapboxgl.accessToken}`;
  
      console.log('Solicitud a Mapbox:', directionsUrl); // Verifica la URL generada
  
      fetch(directionsUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al obtener la ruta');
          }
          return response.json();
        })
        .then((data) => {
          console.log('Datos de la ruta:', data); // Verifica los datos recibidos
  
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0].geometry;
  
            // Dibujar la ruta en el mapa
            if (map) {
              if (map.getSource('route')) {
                map.getSource('route').setData(route);
              } else {
                map.addSource('route', {
                  type: 'geojson',
                  data: route,
                });
  
                map.addLayer({
                  id: 'route',
                  type: 'line',
                  source: 'route',
                  layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                  },
                  paint: {
                    'line-color': '#3887be',
                    'line-width': 5,
                  },
                });
              }
            }
  
            // Realizar la solicitud a tu API para obtener la parada más cercana
            axios
              .get('http://localhost:3001/ruta/cercanas', {
                params: {
                  lat: userLocation.latitude,
                  lng: userLocation.longitude,
                },
              })
              .then((response) => {
                // Aquí se supone que la API devuelve la parada más cercana
                const closestStop = response.data.parada; // Ajusta según la respuesta de tu API
                setNearestStop(closestStop); // Establecer la parada más cercana en el estado
              })
              .catch((error) => {
                console.error('Error al obtener la parada más cercana:', error);
              });
          } else {
            console.error('No se encontró una ruta válida.');
          }
        })
        .catch((error) => {
          console.error('Error al obtener la ruta o paradas cercanas:', error);
        });
    }
  
    setIsModalOpen(false); // Cierra el modal
  };
  
  

  const handleModalCancel = () => {
    setIsModalOpen(false); // Cierra el modal sin hacer nada
  };

  return (
    <div>
      <button
        onClick={handleLocateMe}
        style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000 }}
      >
        Localízame
      </button>

      {/* Mostrar el modal si está abierto */}
      {isModalOpen && destination && (
        <RouteModal
          destination={destination}
          userLocation={userLocation}
          nearestStop={nearestStop} // Pasamos la parada más cercana al modal
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}

      <div
        ref={mapContainerRef}
        style={{
          width: '100vw',
          height: '100vh',
        }}
      />
    </div>
  );
}

export default MapView;
