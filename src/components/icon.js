import markerGold from "../img/markerGold.png";
import markerBasique from "../img/markerBasique.png";
import markerSilver from "../img/markerSilver.png";
import markerShadow from "../img/markerShadow.png";

import L from 'leaflet';

export const IconGold = new L.Icon({
    iconUrl: markerGold,
    iconRetinaUrl: markerGold,
    shadowUrl: markerShadow,
    shadowSize: [50, 41],
    shadowAnchor: [25, 41],
    popupAnchor: [-13, -41],
    iconSize: new L.Point(25, 41),
    iconAnchor: [25, 41],
    className: 'leaflet-div-icon'
});

export const IconSilver = new L.Icon({
    iconUrl: markerSilver,
    iconRetinaUrl: markerSilver,
    shadowUrl: markerShadow,
    shadowSize: [50, 41],
    shadowAnchor: [25, 41],
    popupAnchor: [-13, -41],
    iconSize: new L.Point(25, 41),
    iconAnchor: [25, 41],
    className: 'leaflet-div-icon'
});

export const IconDefault = new L.Icon({
    iconUrl: markerBasique,
    iconRetinaUrl: markerBasique,
    shadowUrl: markerShadow,
    shadowSize: [50, 41],
    shadowAnchor: [25, 41],
    popupAnchor: [-13, -41],
    iconSize: new L.Point(25, 41),
    iconAnchor: [25, 41],
    className: 'leaflet-div-icon'
});
