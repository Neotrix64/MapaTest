import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";

const geocodingClient = mbxGeocoding({ accessToken: MAPBOX_TOKEN });

async function getCoordinates(address) {
  const response = await geocodingClient
    .forwardGeocode({ query: address, limit: 1 })
    .send();
  return response.body.features[0].geometry.coordinates; // [lng, lat]
}
