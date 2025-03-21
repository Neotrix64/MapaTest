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
      const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.longitude},${userLocation.latitude};${destination.lng},${destination.lat}?alternatives=true&geometries=geojson&steps=true&overview=full&access_token=${mapboxgl.accessToken}`;
  
      console.log('Solicitud a Mapbox:', directionsUrl);
  
      fetch(directionsUrl)
        .then((response) => response.ok ? response.json() : Promise.reject("Error al obtener la ruta"))
        .then((data) => {
          console.log('Datos de la ruta:', data);
  
          if (data.routes?.length > 0) {
            const route = data.routes[0].geometry;
  
            if (map) {
              if (map.getSource('route')) {
                map.getSource('route').setData(route);
              } else {
                map.addSource('route', { type: 'geojson', data: route });
  
                map.addLayer({
                  id: 'route',
                  type: 'line',
                  source: 'route',
                  layout: { 'line-join': 'round', 'line-cap': 'round' },
                  paint: { 'line-color': '#3887be', 'line-width': 5 },
                });
              }
            }
  
            // 🔹 Función para dibujar líneas del metro y sus marcadores
            const drawMetroLine = (lineName, sourceId, layerId, color, markerColor) => {
              axios.get('http://localhost:3001/metro/findParades', {
                params: { nombreRuta: lineName }
              }).then((response) => {
                const metroStops = response.data.message;
  
                if (!metroStops || metroStops.length < 2) {
                  console.warn(`No hay suficientes paradas para dibujar ${lineName}.`);
                  return;
                }
  
                let metroCoordinates = [];
                metroStops.forEach((parada, index) => {
                  const [lat, lng] = parada.ubicacion.coordinates;
                  metroCoordinates.push([lng, lat]); // 🔄 Intercambiamos el orden para Mapbox
                  console.log(`${lineName} - Parada ${index + 1}: ${parada.nombre} → (${lng}, ${lat})`);
  
                  const el = document.createElement("div");
                  el.className = "marker";
                  el.style.backgroundColor = "#8EFFC1";
                  el.style.width = "12px";
                  el.style.height = "12px";
                  el.style.borderRadius = "50%";
  
                  new mapboxgl.Marker(el)
                    .setLngLat([lng, lat])
                    .setPopup(new mapboxgl.Popup().setHTML(`<b>${parada.nombre}</b>`))
                    .addTo(map);
                });
  
                if (map && metroCoordinates.length > 1) {
                  const metroGeoJson = {
                    type: "Feature",
                    geometry: {
                      type: "LineString",
                      coordinates: metroCoordinates,
                    }
                  };
  
                  if (map.getSource(sourceId)) {
                    map.getSource(sourceId).setData(metroGeoJson);
                  } else {
                    map.addSource(sourceId, { type: "geojson", data: metroGeoJson });
  
                    map.addLayer({
                      id: layerId,
                      type: "line",
                      source: sourceId,
                      layout: { "line-join": "round", "line-cap": "round" },
                      paint: { "line-color": color, "line-width": 8, "line-opacity": 1 },
                    });
                  }
                } else {
                  console.warn(`Mapa no disponible o no hay suficientes coordenadas para ${lineName}.`);
                }
              }).catch(err => console.error(`Error obteniendo paradas de ${lineName}:`, err));
            };
  
            // 🔹 Dibujar Línea 1 (Azul) con marcadores azules
            drawMetroLine("Línea 1 Metro SD", "metro-line-1", "metro-layer-1", "#0000FF", "#0000FF");
  
            // 🔹 Dibujar Línea 2 (Rojo) con marcadores rojos
            drawMetroLine("Línea 2 Metro SD", "metro-line-2", "metro-layer-2", "#FF0000", "#FF0000");
  
            // 🔹 Obtener la parada más cercana
            axios.get('http://localhost:3001/ruta/cercanas', {
              params: { lat: userLocation.latitude, lng: userLocation.longitude }
            }).then((response) => {
              setNearestStop(response.data.parada);
            }).catch((error) => console.error('Error obteniendo la parada más cercana:', error));
          } else {
            console.error('No se encontró una ruta válida.');
          }
        })
        .catch(error => console.error('Error al obtener la ruta:', error));
    }
  
    setIsModalOpen(false);
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
