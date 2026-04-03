import { MapContainer, TileLayer, useMap, useMapEvent, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import React, { Fragment, useContext, useEffect } from 'react';
import L from 'leaflet';
import coords from '../datas/datas.json';
import { IconGold, IconSilver, IconDefault } from '../components/icon.js';
import { PinContext, Text } from '../store';
import Modalcontent from './modal.js';
import Warningcontent from './warning.js';

const listDate = Object.keys(coords);
const Paris = [48.853381, 2.348367];
const FOOT_ROUTER_BASE_URL = 'https://routing.openstreetmap.de/routed-foot';
const MAX_WALKING_DURATION_SECONDS = 60 * 60;

function transformForGgl(value) {
    return `${value.replace(/\s+/g, '+')}+paris`;
}

function buildYearTitle(rank, year, dictionary) {
    const winnerPrefix = dictionary.winnerOfYearPrefix || 'Best baguette';
    const finalistPrefix = dictionary.finalistOfYearPrefix || 'Finalist year';

    return rank === 0 ? `${winnerPrefix} ${year}` : `${finalistPrefix} ${year}`;
}

function loopOnAllMarkers(bakeries, rankAsked, dictionary, includeObsolete = true) {
    for (const [index, value] of listDate.entries()) {
        let currentRank = 0;
        let lengthToLoop = coords[listDate[index]].length;

        if (rankAsked !== 0) {
            currentRank = rankAsked - 1;
            lengthToLoop = rankAsked > lengthToLoop ? currentRank : rankAsked;
        }

        for (currentRank; currentRank < lengthToLoop; currentRank++) {
            const bakeryEntry = coords[listDate[index]][currentRank];
            const idCoords = JSON.stringify(bakeryEntry.coords);
            const valid = bakeryEntry.valid !== undefined ? bakeryEntry.valid : true;

            if (!includeObsolete && !valid) {
                continue;
            }

            const title = buildYearTitle(currentRank, value, dictionary);
            if (!bakeries.hasOwnProperty(idCoords)) {
                bakeries[idCoords] = {
                    popup: [title],
                    rank: currentRank,
                    obsolete: !valid,
                    name: bakeryEntry.name,
                    adresse: bakeryEntry.adresse,
                    coords: bakeryEntry.coords
                };
            } else {
                bakeries[idCoords].popup.push(title);
                if (currentRank < bakeries[idCoords].rank) {
                    bakeries[idCoords].rank = currentRank;
                }
            }
        }
    }

    return bakeries;
}

function loopForOneMarker(bakeries, year, dictionary, includeObsolete = true) {
    for (let index = 0; index < coords[year].length; index++) {
        const bakeryEntry = coords[year][index];
        const idCoords = JSON.stringify(bakeryEntry.coords);
        const valid = bakeryEntry.valid !== undefined ? bakeryEntry.valid : true;

        if (!includeObsolete && !valid) {
            continue;
        }

        const title = buildYearTitle(index, year, dictionary);
        if (!bakeries.hasOwnProperty(idCoords)) {
            bakeries[idCoords] = {
                popup: [title],
                rank: index,
                obsolete: !valid,
                name: bakeryEntry.name,
                adresse: bakeryEntry.adresse,
                coords: bakeryEntry.coords
            };
        } else {
            bakeries[idCoords].popup.push(title);
            if (index < bakeries[idCoords].rank) {
                bakeries[idCoords].rank = index;
            }
        }
    }

    return bakeries;
}

function getBakeriesForSelection(year, askedRank, dictionary, includeObsolete = true) {
    const bakeries = {};

    if (year === 0) {
        return loopOnAllMarkers(bakeries, askedRank, dictionary, includeObsolete);
    }

    return loopForOneMarker(bakeries, year, dictionary, includeObsolete);
}

function degreesToRadians(value) {
    return value * (Math.PI / 180);
}

function haversineDistance(from, to) {
    const earthRadius = 6371000;
    const dLat = degreesToRadians(to[0] - from[0]);
    const dLng = degreesToRadians(to[1] - from[1]);
    const lat1 = degreesToRadians(from[0]);
    const lat2 = degreesToRadians(to[0]);
    const a = (Math.sin(dLat / 2) ** 2)
        + Math.cos(lat1) * Math.cos(lat2) * (Math.sin(dLng / 2) ** 2);

    return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

function formatDistance(distance) {
    if (distance < 1000) {
        return `${Math.round(distance)} m`;
    }

    return `${(distance / 1000).toFixed(1)} km`;
}

function formatDuration(duration) {
    const totalMinutes = Math.round(duration / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
        return `${totalMinutes} min`;
    }

    return `${hours} h ${minutes.toString().padStart(2, '0')}`;
}

function buildClosedBakeryReference(bakery) {
    if (!bakery) {
        return '';
    }

    return `${bakery.name}\n${bakery.adresse}\n${bakery.popup.join('\n')}`;
}

async function getWalkingRoute(userPosition, bakery) {
    const [userLat, userLng] = userPosition;
    const [bakeryLat, bakeryLng] = bakery.coords;
    const url = `${FOOT_ROUTER_BASE_URL}/route/v1/foot/${userLng},${userLat};${bakeryLng},${bakeryLat}?alternatives=false&overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('routing_failed');
    }

    const payload = await response.json();
    const route = payload && payload.routes ? payload.routes[0] : null;
    const startWaypoint = payload && payload.waypoints ? payload.waypoints[0] : null;
    const endWaypoint = payload && payload.waypoints ? payload.waypoints[1] : null;
    const hasGeometry = route && route.geometry && route.geometry.coordinates && route.geometry.coordinates.length;
    const hasStartLocation = startWaypoint && startWaypoint.location && startWaypoint.location.length;
    const hasEndLocation = endWaypoint && endWaypoint.location && endWaypoint.location.length;

    if (!route || !hasGeometry || !hasStartLocation || !hasEndLocation) {
        throw new Error('routing_missing');
    }

    const [snappedStartLng, snappedStartLat] = startWaypoint.location;
    const [snappedEndLng, snappedEndLat] = endWaypoint.location;

    return {
        bakery,
        route,
        snappedStart: [snappedStartLat, snappedStartLng],
        snappedEnd: [snappedEndLat, snappedEndLng]
    };
}

function constructJsx(bakeries, map, openClosedBakeryReport) {
    const jsxElements = [];
    let shouldBeOneAtLeast = 0;
    let index = 0;

    for (const bakeryKey in bakeries) {
        const bakery = bakeries[bakeryKey];
        const trophies = [];

        for (const [popupIndex, value] of bakery.popup.entries()) {
            trophies.push(<span key={popupIndex}>{value}</span>);
        }

        const forUrl = transformForGgl(bakery.adresse);
        let icon = IconDefault;
        if (bakery.rank === 0) icon = IconGold;
        if (bakery.rank === 1) icon = IconSilver;

        if (map.getBounds().contains(bakery.coords)) {
            shouldBeOneAtLeast++;
        }

        jsxElements.push(
            <Marker
                key={index}
                position={bakery.coords}
                icon={icon}
                opacity={bakery.obsolete === true ? 0.5 : 1}
            >
                <Popup>
                    {bakery.obsolete === true && <strong className="unexistant"><Text tid="anymore" /></strong>}
                    {trophies}
                    <strong>{bakery.name}</strong>
                    <address>
                        <a
                            rel="noreferrer"
                            target="_blank"
                            href={`https://www.google.fr/maps/place/${forUrl}`}>
                            {bakery.adresse}
                        </a>
                    </address>
                    {bakery.obsolete !== true && (
                        <button
                            className="popup-link-button"
                            onClick={() => openClosedBakeryReport(bakery)}
                            type="button"
                        >
                            <Text tid="closedBakeryReportLink" />
                        </button>
                    )}
                </Popup>
            </Marker>
        );

        index++;
    }

    return [jsxElements, shouldBeOneAtLeast];
}

function FitRouteBounds({ route, userPosition, destination }) {
    const map = useMap();

    useEffect(() => {
        if (!route || !userPosition || !destination) {
            return;
        }

        const points = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        points.push(userPosition, destination.coords);
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }, [route, userPosition, destination, map]);

    return null;
}

function ListMarkers(props) {
    const map = useMap();
    const setWarn = props.warning;
    const bakeries = getBakeriesForSelection(props.list, props.askedrank, props.dictionary, true);
    const bakeriesWithMapState = constructJsx(bakeries, map, props.openClosedBakeryReport);

    useEffect(() => {
        setWarn(bakeriesWithMapState[1] === 0);
    });

    useMapEvent('drag', () => {
        const updated = constructJsx(bakeries, map, props.openClosedBakeryReport);
        props.warning(updated[1] === 0);
    });

    useMapEvent('zoomend', () => {
        const updated = constructJsx(bakeries, map, props.openClosedBakeryReport);
        props.warning(updated[1] === 0);
    });

    return (
        <Fragment>
            {bakeriesWithMapState[0]}
        </Fragment>
    );
}

const Map = () => {
    const { pins, dm, setDm, warning, rankselected, setWarning, routing, setRouting, dictionary, closedBakeryReport, setClosedBakeryReport } = useContext(PinContext);

    const routePoints = routing.route
        ? routing.route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        : [];

    function clearWalkRoute() {
        setRouting({
            loading: false,
            error: '',
            tooFar: false,
            route: null,
            destination: null,
            userPosition: null
        });
    }

    function openClosedBakeryReport(bakery) {
        setClosedBakeryReport(bakery);
    }

    function closeClosedBakeryReport() {
        setClosedBakeryReport(null);
    }

    async function handleWalkRoute() {
        const bakeries = Object.values(getBakeriesForSelection(pins, rankselected, dictionary, false));

        if (bakeries.length === 0) {
            setRouting({
                loading: false,
                error: 'walkRouteNoBakery',
                tooFar: false,
                route: null,
                destination: null,
                userPosition: null
            });
            return;
        }

        if (!navigator.geolocation) {
            setRouting({
                loading: false,
                error: 'walkRouteGeolocationError',
                tooFar: false,
                route: null,
                destination: null,
                userPosition: null
            });
            return;
        }

        setRouting({
            loading: true,
            error: '',
            tooFar: false,
            route: null,
            destination: null,
            userPosition: null
        });

        navigator.geolocation.getCurrentPosition(async ({ coords: position }) => {
            const userPosition = [position.latitude, position.longitude];
            const closestCandidates = bakeries
                .map((bakery) => ({
                    bakery,
                    distance: haversineDistance(userPosition, bakery.coords)
                }))
                .sort((left, right) => left.distance - right.distance)
                .slice(0, 8)
                .map(({ bakery }) => bakery);

            try {
                const routes = await Promise.all(
                    closestCandidates.map((bakery) => getWalkingRoute(userPosition, bakery))
                );

                routes.sort((left, right) => left.route.distance - right.route.distance);
                const best = routes[0];

                if (best.route.duration > MAX_WALKING_DURATION_SECONDS) {
                    setRouting({
                        loading: false,
                        error: '',
                        tooFar: true,
                        route: null,
                        destination: null,
                        userPosition: null
                    });
                    return;
                }

                setRouting({
                    loading: false,
                    error: '',
                    tooFar: false,
                    route: best.route,
                    destination: best.bakery,
                    userPosition: best.snappedStart
                });
            } catch (error) {
                setRouting({
                    loading: false,
                    error: 'walkRouteError',
                    tooFar: false,
                    route: null,
                    destination: null,
                    userPosition
                });
            }
        }, () => {
            setRouting({
                loading: false,
                error: 'walkRouteGeolocationError',
                tooFar: false,
                route: null,
                destination: null,
                userPosition: null
            });
        }, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        });
    }

    function escFunction(event) {
        if (event.keyCode === 27) {
            if (dm) {
                setDm(false);
                setWarning(false);
            }
            if (closedBakeryReport) {
                closeClosedBakeryReport();
            }
        }
    }

    useEffect(() => {
        document.addEventListener("keydown", escFunction, false);
        return () => document.removeEventListener("keydown", escFunction, false);
    });

    useEffect(() => {
        setRouting({
            loading: false,
            error: '',
            tooFar: false,
            route: null,
            destination: null,
            userPosition: null
        });
    }, [pins, rankselected, setRouting]);

    const mapsDirectionUrl = routing.destination && routing.userPosition
        ? `https://www.google.com/maps/dir/?api=1&origin=${routing.userPosition[0]},${routing.userPosition[1]}&destination=${encodeURIComponent(routing.destination.adresse)}&travelmode=walking`
        : null;

    return (
        <div className="App">
            {dm === true &&
                <div className={"modal"}>
                    <Modalcontent />
                </div>
            }
            {routing.tooFar === true &&
                <div className={"modal"}>
                    <div className="innerModal">
                        <div title="Fermer" onClick={clearWalkRoute} className="close"></div>
                        <h2><Text tid="walkRouteSummary" /></h2>
                        <p><Text tid="walkRouteTooFar" /></p>
                    </div>
                </div>
            }
            {closedBakeryReport &&
                <div className={"modal"}>
                    <div className="innerModal">
                        <div title="Fermer" onClick={closeClosedBakeryReport} className="close"></div>
                        <h2><Text tid="closedBakeryReportTitle" /></h2>
                        <p><Text tid="closedBakeryReportText" /></p>
                        <p className="closed-bakery-report__email">ecrivez.moi@simonertel.net</p>
                        <textarea
                            className="closed-bakery-report__textarea"
                            readOnly
                            value={buildClosedBakeryReference(closedBakeryReport)}
                        />
                    </div>
                </div>
            }
            {warning === true &&
                <div className={"warning"}>
                    <Warningcontent />
                </div>
            }
            <div
                className={"about"}
                title={"En savoir plus"}
                onClick={() => setDm(!dm)}
            >
                <span>?</span>
            </div>
            <div className="walk-routing">
                <button
                    className="walk-routing__button"
                    onClick={handleWalkRoute}
                    disabled={routing.loading}
                    type="button"
                >
                    <Text tid="walkRoute" />
                </button>
                {(routing.loading || routing.error || routing.destination) && !routing.tooFar && (
                    <div className="walk-routing__panel">
                        {routing.loading && <p><Text tid="walkRouteLoading" /></p>}
                        {!routing.loading && routing.error && <p><Text tid={routing.error} /></p>}
                        {!routing.loading && routing.destination && routing.route && (
                            <Fragment>
                                <strong><Text tid="walkRouteSummary" /></strong>
                                <p>{routing.destination.name}</p>
                                <p>{routing.destination.adresse}</p>
                                <p><Text tid="walkRouteDistance" /> : {formatDistance(routing.route.distance)}</p>
                                <p><Text tid="walkRouteDuration" /> : {formatDuration(routing.route.duration)}</p>
                                {mapsDirectionUrl && (
                                    <a href={mapsDirectionUrl} rel="noreferrer" target="_blank">
                                        <Text tid="walkRouteOpen" />
                                    </a>
                                )}
                                <button
                                    className="walk-routing__clear"
                                    onClick={clearWalkRoute}
                                    type="button"
                                >
                                    <Text tid="walkRouteClear" />
                                </button>
                            </Fragment>
                        )}
                    </div>
                )}
            </div>
            <MapContainer
                center={Paris}
                zoom={13}
                scrollWheelZoom={false}
                tap={false}
            >
                <TileLayer
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ListMarkers
                    list={pins}
                    warning={setWarning}
                    askedrank={rankselected}
                    dictionary={dictionary}
                    openClosedBakeryReport={openClosedBakeryReport}
                />
                {routing.userPosition && (
                    <CircleMarker
                        center={routing.userPosition}
                        pathOptions={{ color: '#1b74e4', fillColor: '#1b74e4', fillOpacity: 0.95 }}
                        radius={8}
                    >
                        <Popup>Vous etes ici</Popup>
                    </CircleMarker>
                )}
                {routing.route && (
                    <Polyline
                        pathOptions={{ color: '#1b74e4', weight: 5, opacity: 0.85 }}
                        positions={routePoints}
                    />
                )}
                {routing.route && routing.userPosition && routing.destination && (
                    <FitRouteBounds
                        route={routing.route}
                        userPosition={routing.userPosition}
                        destination={routing.destination}
                    />
                )}
            </MapContainer>
        </div>
    );
};

export default Map;
