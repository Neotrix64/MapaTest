import mbxDirections from "@mapbox/mapbox-sdk/services/directions";

const directionsClient = mbxDirections({ accessToken: MAPBOX_TOKEN });

async function getRoute(start, end) {
  const response = await directionsClient
    .getDirections({
      profile: "mapbox/driving",
      waypoints: [{ coordinates: start }, { coordinates: end }],
      geometries: "geojson",
    })
    .send();

  return response.body.routes[0].geometry;
}
