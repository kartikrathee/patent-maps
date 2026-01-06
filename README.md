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
The abstract and claims describe an initial cover, clusters, density-based region
selection, local covers at a finer scale, and joining these covers through shared
members to produce a varied-scale topological construct.

| Document concept | Implementation |
| --- | --- |
| Lens / image space | Web Mercator projection of latitude and longitude |
| Initial cover | Adjustable, overlapping 2D geographic bins |
| Clustering in each bin | Connected components under a haversine-distance threshold |
| Nerve of the cover | An edge for each nonempty intersection of cluster record IDs |
| Density-based region selection | Records per approximate geographic area of a cover bin |
| Local construct | A new cover over the densest region, using one fifth of the global clustering radius |
| Combine scales | Replace nodes wholly inside the region; preserve outside and boundary nodes and rebuild shared-member edges |

The algorithm needs no training. It retains isolated records, handles coincident
coordinates and the antimeridian, and runs in a Web Worker. The implementation
does not claim to reproduce the document's optional contractibility or
component-persistence proofs, routes, traffic predictions, or a distributed
database. Those are separate capabilities.

The supplied document contains five example cities and demographic/application
fields. It does not contain a complete geospatial dataset. The app generates 640
deterministic, explicitly labelled synthetic records around New York,
Wilmington, Boise, Portland, and Wichita. Generated points are illustrative and
are not real people or observations.

## Import your data

Use **Import your dataset** with a JSON array of 1–2,000 records, below 2 MB:

```json
[
  {"id":"location-1","lat":40.7128,"lng":-74.006,"city":"New York","age":24,"application":"Illustrator"},
  {"id":"location-2","lat":39.7391,"lng":-75.5398,"city":"Wilmington","age":40,"application":"Acrobat"}
]
```

Latitude and longitude must be finite numbers; latitude is limited to ±85 for
Mercator projection. IDs must be unique. `city`, `age`, `application`, and `gender`
are optional. Imported data is kept in browser memory and is not uploaded by this
app. Google receives map viewport and map rendering requests when connected.

## Verification

`npm test` checks complete record coverage, exact edge weights, preserved outside
nodes, cross-scale connections, isolated records, dateline behavior, determinism,
and import/parameter validation. `npm run check` verifies JavaScript syntax and
the UI's DOM references. Live Google Maps authentication requires an actual key.
