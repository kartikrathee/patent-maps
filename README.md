# Scale Atlas

A Google Maps explorer adapting the supplied patent's varied-scale topological
visualization to geographic records. It includes a working illustrative preview,
live Google Maps integration, dataset import, density-driven local refinement,
and an inspector for cluster membership and shared-record links.

## Run

Node.js 20 or newer. No package installation or build step is needed.

```sh
cd patent-maps
npm test
npm run check
npm start
```

Open `http://127.0.0.1:8318/`.

## Google Maps

Click **Connect Google Maps** and supply a browser API key with the Maps JavaScript
API enabled, or set `googleMapsApiKey` in `dist/config.js` for your deployment.
Use your own map ID or the supplied `DEMO_MAP_ID` for initial testing. Configure
the key's HTTP-referrer restrictions for your local and deployed origins. Keys
entered through the dialog are held in memory; no browser storage is used.

The integration loads the Maps JavaScript API asynchronously, imports its maps
and marker libraries, places `AdvancedMarkerElement` cluster markers, draws
shared-record `Polyline` connections, and uses a GeoJSON data layer for records.
It supports fitting the dataset, selecting clusters, zooming, and focusing a local
region. Authentication and network failures preserve the preview and dataset.

Google's documentation:

- [API setup](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [API loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [Advanced markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/start)

Live Google Maps requires a valid key; the illustrative preview is not Google
cartography. The inspector's **Open location in Google Maps** link works without
a JavaScript API key.

## Patent concepts implemented

Source: `../output/pdf/Distributed-NoSQL-Cluster-DB-untrained decision makerII-updated-2023.pdf`.
