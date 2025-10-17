import markerGold from "../img/markerGold.png";
import markerBasique from "../img/markerBasique.png";
import markerSilver from "../img/markerSilver.png";
import markerShadow from "../img/markerShadow.png";

import L from 'leaflet';

const anchorX = 12.5;
const anchorY = 41;
const popupShiftY = -41;

const baseOptions = {
    shadowSize: [50, 41],
    shadowAnchor: [anchorX, anchorY],
    popupAnchor: [0, popupShiftY],
    iconSize: new L.Point(25, 41),
    iconAnchor: [anchorX, anchorY],
    className: 'leaflet-div-icon'
};

export const IconGold = new L.Icon({
    ...baseOptions,
    iconUrl: markerGold,
    iconRetinaUrl: markerGold,
    shadowUrl: markerShadow
});

export const IconSilver = new L.Icon({
    ...baseOptions,
    iconUrl: markerSilver,
    iconRetinaUrl: markerSilver,
    shadowUrl: markerShadow
});

export const IconDefault = new L.Icon({
    ...baseOptions,
    iconUrl: markerBasique,
    iconRetinaUrl: markerBasique,
    shadowUrl: markerShadow
});
