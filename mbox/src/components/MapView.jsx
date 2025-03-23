import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import RouteModal from './RouteModal'; // Importa el modal
import axios from 'axios'; // Para hacer peticiones a la API

function MapView() {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState("LngLat(0, 0)"); 
  const [destLat, setDestLat] = useState(null);
  const [destLng, setDestLng] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nearestStop, setNearestStop] = useState(null);

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoibmVvZGV2IiwiYSI6ImNtOGQ4ZmIxMzBtc2kybHBzdzNxa3U4eDcifQ.1Oa8lXU045VvFUul26Kwkg';

    const initialMap = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11', 
      center: [-74.0242, 40.6941],
      zoom: 14,
    });

    setMap(initialMap);

    initialMap.on('click', (e) => {
      setDestination(e.lngLat); // Establece el destino con la ubicación clickeada
      setDestLat(e.lngLat.lat);
      setDestLng(e.lngLat.lng);
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

  const [activeMarkers, setActiveMarkers] = useState([]);  // Array para manejar los marcadores activos

  const handleModalConfirm = () => {
    if (userLocation && destination) {
      // Primero, eliminamos los marcadores anteriores
      activeMarkers.forEach(marker => marker.remove());
      setActiveMarkers([]);  // Limpiar el estado de los marcadores
  
      // Obtener la parada más cercana al destino
      axios.get('http://localhost:3001/ruta/PosiblesCercanas', {
        params: { lat: destination.lat, lng: destination.lng }
      })
      .then((destRes) => {
        const nearestDestStop = destRes.data.message && destRes.data.message.length > 0 ? destRes.data.message[0] : null;
  
        if (!nearestDestStop) {
          console.warn("No se encontró una parada cercana al destino.");
          return;
        }
  
        console.log("Parada más cercana al destino:", nearestDestStop);
  
        // Obtener la parada más cercana al usuario
        axios.get('http://localhost:3001/ruta/PosiblesCercanas', {
          params: { lat: userLocation.latitude, lng: userLocation.longitude }
        })
        .then((startRes) => {
          const nearestStartStop = startRes.data.message && startRes.data.message.length > 0 ? startRes.data.message[0] : null;
  
          if (!nearestStartStop) {
            console.warn("No se encontró una parada cercana al usuario.");
            return;
          }
  
          console.log("Parada más cercana al usuario:", nearestStartStop);
  
          // Validación de coordenadas de la parada
          if (!Array.isArray(nearestStartStop.ubicacion) || nearestStartStop.ubicacion.length < 2) {
            console.warn("La parada más cercana no tiene coordenadas válidas.", nearestStartStop);
            return;
          }
  
          const waypoint = `${nearestStartStop.ubicacion[1]},${nearestStartStop.ubicacion[0]}`;
  
          // 🔹 Crear la URL con la parada intermedia
          const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.longitude},${userLocation.latitude};${waypoint};${destination.lng},${destination.lat}?alternatives=true&geometries=geojson&steps=true&overview=full&access_token=${mapboxgl.accessToken}`;
  
          console.log('Solicitud a Mapbox con waypoint:', directionsUrl);
  
          fetch(directionsUrl)
            .then((response) => response.ok ? response.json() : Promise.reject("Error al obtener la ruta"))
            .then((data) => {
              console.log('Datos de la ruta con waypoint:', data);
  
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
  
                // 🔹 Agregar marcador en la parada intermedia
                const startMarker = new mapboxgl.Marker({ color: "blue" })
                  .setLngLat([nearestStartStop.ubicacion[1], nearestStartStop.ubicacion[0]])
                  .setPopup(new mapboxgl.Popup().setHTML(`<b>Parada intermedia: ${nearestStartStop.nombre}</b>`))
                  .addTo(map);
  
                // 🔴 Marcador rojo para la parada de destino final
                const destMarker = new mapboxgl.Marker({ color: "red" })
                  .setLngLat([nearestDestStop.ubicacion[1], nearestDestStop.ubicacion[0]])
                  .setPopup(new mapboxgl.Popup().setHTML(`<b>Parada de destino final: ${nearestDestStop.nombre}</b>`))
                  .addTo(map);
  
                // Agregar los nuevos marcadores al estado de activeMarkers
                setActiveMarkers([startMarker, destMarker]);
              }
  
              // 🔹 Dibujar líneas del metro y sus marcadores
              const drawMetroLine = (lineName, sourceId, layerId, color) => {
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
                    metroCoordinates.push([lng, lat]);
                    console.log(`${lineName} - Parada ${index + 1}: ${parada.nombre} → (${lng}, ${lat})`);
  
                    const el = document.createElement("div");
                    el.className = "marker";
                    el.style.backgroundColor = "#fff";
                    el.style.width = "25px";
                    el.style.height = "25px";
                    el.style.borderRadius = "50%";
                    el.style.display = "flex";
                    el.style.alignItems = "center";
                    el.style.justifyContent = "center";
                    el.style.border = `2px solid ${color}`;
                    el.style.fontSize = "10px";
                    el.style.fontWeight = "bold";
                    el.style.color = "#000"; // Texto negro
  
                    const label = document.createElement("span");
                    label.innerText = parada.nombre[0]; // Primera letra de la parada
                    el.appendChild(label);
  
                    new mapboxgl.Marker(el)
                      .setLngLat([lng, lat])
                      .setPopup(new mapboxgl.Popup().setHTML(`<b style="color: #000;">${parada.nombre}</b>`))
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
                        paint: { "line-color": color, "line-width": 6, "line-opacity": 1 },
                      });
                    }
                  } else {
                    console.warn(`Mapa no disponible o no hay suficientes coordenadas para ${lineName}.`);
                  }
                }).catch(err => console.error(`Error obteniendo paradas de ${lineName}:`, err));
              };
  
              drawMetroLine("Línea 1 Metro SD", "metro-line-1", "metro-layer-1", "#0000FF");
              drawMetroLine("Línea 2 Metro SD", "metro-line-2", "metro-layer-2", "#FF0000");
  
            })
            .catch(error => console.error('Error al obtener la ruta:', error));
        })
        .catch((error) => console.error('Error obteniendo la parada más cercana al usuario:', error));
      })
      .catch((error) => console.error('Error obteniendo la parada más cercana al destino:', error));
    } else {
      console.warn("Faltan datos: ubicación del usuario o destino.");
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
