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
const MAX_ROUTE_CANDIDATES = 3;
const MAX_GOLD_ROUTE_CANDIDATES = 1;
const routeCache = new Map();
const ROUTE_FETCH_TIMEOUT_MS = 5000;

function transformForGgl(value) {
    return `${value.replace(/\s+/g, '+')}+paris`;
}

function buildYearTitle(rank, year, dictionary) {
    const winnerPrefix = dictionary.winnerOfYearPrefix || 'Best baguette';
    const finalistPrefix = dictionary.finalistOfYearPrefix || 'Finalist year';

    return rank === 0 ? `${winnerPrefix} ${year}` : `${finalistPrefix} ${year}`;
}

function buildBakeryKey(bakeryEntry) {
    if (bakeryEntry.adresse) {
        return bakeryEntry.adresse
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[,'"“”«»–-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    return JSON.stringify(bakeryEntry.coords);
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
            const bakeryKey = buildBakeryKey(bakeryEntry);
            const valid = bakeryEntry.valid !== undefined ? bakeryEntry.valid : true;

            if (!includeObsolete && !valid) {
                continue;
            }

            const title = buildYearTitle(currentRank, value, dictionary);
            if (!bakeries.hasOwnProperty(bakeryKey)) {
                bakeries[bakeryKey] = {
                    popup: [title],
                    rank: currentRank,
                    obsolete: !valid,
                    name: bakeryEntry.name,
                    adresse: bakeryEntry.adresse,
                    coords: bakeryEntry.coords
                };
            } else {
                bakeries[bakeryKey].popup.push(title);
                if (currentRank < bakeries[bakeryKey].rank) {
                    bakeries[bakeryKey].rank = currentRank;
                }
            }
        }
    }

    return bakeries;
}

function loopForOneMarker(bakeries, year, dictionary, includeObsolete = true) {
    for (let index = 0; index < coords[year].length; index++) {
        const bakeryEntry = coords[year][index];
        const bakeryKey = buildBakeryKey(bakeryEntry);
        const valid = bakeryEntry.valid !== undefined ? bakeryEntry.valid : true;

        if (!includeObsolete && !valid) {
            continue;
        }

        const title = buildYearTitle(index, year, dictionary);
        if (!bakeries.hasOwnProperty(bakeryKey)) {
            bakeries[bakeryKey] = {
                popup: [title],
                rank: index,
                obsolete: !valid,
                name: bakeryEntry.name,
                adresse: bakeryEntry.adresse,
                coords: bakeryEntry.coords
            };
        } else {
            bakeries[bakeryKey].popup.push(title);
            if (index < bakeries[bakeryKey].rank) {
                bakeries[bakeryKey].rank = index;
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

function RouteMetricIcon({ type }) {
    if (type === 'maps') {
        return (
            <svg aria-hidden="true" viewBox="0 0 5644.173 5644.173">
                <path fill="#0F9D58" d="M2553.316 3090.856l2268.569-2535.46c-37.479-11.6-77.248-17.856-118.408-17.856H403.155C181.42 537.54 0 718.96 0 940.695v4300.322c0 41.16 6.257 80.929 17.856 118.408l2535.46-2268.569z"/>
                <path fill="#4285F4" d="M2553.316 3090.856L284.747 5626.316c37.479 11.6 77.248 17.856 118.408 17.856h4300.322c41.16 0 80.929-6.256 118.408-17.856l-2268.569-2535.46z"/>
                <path fill="#D2D2D2" d="M2553.316 3090.856l2535.46 2268.569c11.6-37.479 17.856-77.248 17.856-118.408V940.695c0-41.16-6.257-80.929-17.856-118.408l-2535.46 2268.569z"/>
                <path fill="#F1F1F1" d="M5106.633 5241.018L2687.701 2822.086l-470.348 403.155 2418.931 2418.931h67.192c221.737.001 403.157-181.419 403.157-403.154z"/>
                <path fill="#FFDE48" d="M4703.478 537.54L0 5241.018c0 221.736 181.42 403.155 403.155 403.155h67.193l4636.285-4636.285v-67.193c0-221.735-181.42-403.155-403.155-403.155z"/>
                <path fill="#EEE" d="M1142.273 1545.428v286.24h397.78c-31.581 169.997-180.748 293.631-397.78 293.631-241.221 0-437.423-204.265-437.423-444.814s196.202-444.814 437.423-444.814c108.852 0 205.609 37.628 282.881 110.196l211.657-211.656c-128.338-120.275-294.975-193.515-494.537-193.515-408.531 0-739.118 330.587-739.118 739.118s330.587 739.118 739.118 739.118c426.672 0 709.553-300.351 709.553-722.32 0-52.41-4.703-102.805-13.438-151.183h-696.116z"/>
                <path fill="#DB4437" d="M4300.322 0c-742.478 0-1343.851 601.373-1343.851 1343.851 0 1012.591 1130.85 1540.053 1264.563 2985.364 4.031 40.315 38.3 71.896 79.287 71.896s75.927-31.581 79.287-71.896c133.713-1445.312 1264.563-1972.773 1264.563-2985.364C5644.173 601.373 5042.8 0 4300.322 0z"/>
                <circle cx="4300.322" cy="1343.851" r="470.348" fill="#7B231E"/>
            </svg>
        );
    }

    if (type === 'duration') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="13" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 9.5v4l2.8 1.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                <path d="M12 4.5v1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="4.75" r="2.25" fill="currentColor" />
            <path d="M12 7.6v4.3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            <path d="M12 8.9l-3.2 2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            <path d="M12 8.9l3 2.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            <path d="M12 11.9l-2.2 4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            <path d="M12 11.9l3.4 4.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
    );
}

function RouteCard({
    title,
    name,
    address,
    distance,
    duration,
    approximate,
    approximateLabel,
    mapsDirectionUrl,
    accentClassName = ''
}) {
    return (
        <section className={`walk-routing__card ${accentClassName}`.trim()}>
            <p className="walk-routing__eyebrow">{title}</p>
            <p className="walk-routing__name">{name}</p>
            <p className="walk-routing__address">{address}</p>
            <div className="walk-routing__metrics">
                <span className="walk-routing__metric">
                    <span className="walk-routing__metric-icon">
                        <RouteMetricIcon type="distance" />
                    </span>
                    {distance}
                </span>
                {duration && (
                    <span className="walk-routing__metric">
                        <span className="walk-routing__metric-icon">
                            <RouteMetricIcon type="duration" />
                        </span>
                        {duration}
                    </span>
                )}
            </div>
            {approximate && <p className="walk-routing__approximate">{approximateLabel}</p>}
            {mapsDirectionUrl && (
                <a className="walk-routing__metric walk-routing__metric--link" href={mapsDirectionUrl} rel="noreferrer" target="_blank">
                    <span className="walk-routing__metric-icon walk-routing__metric-icon--maps">
                        <RouteMetricIcon type="maps" />
                    </span>
                    Google Maps
                </a>
            )}
        </section>
    );
}

function getClosestCandidates(userPosition, bakeries, candidateLimit) {
    return bakeries
        .map((bakery) => ({
            bakery,
            distance: haversineDistance(userPosition, bakery.coords)
        }))
        .sort((left, right) => left.distance - right.distance)
        .slice(0, candidateLimit)
        .map(({ bakery }) => bakery);
}

function createApproximateRouteResult(userPosition, bakery) {
    return {
        bakery,
        route: null,
        snappedStart: userPosition,
        snappedEnd: bakery.coords,
        approximateDistance: haversineDistance(userPosition, bakery.coords)
    };
}

async function findBestWalkingRoute(userPosition, bakeries, candidateLimit = MAX_ROUTE_CANDIDATES) {
    const closestCandidates = getClosestCandidates(userPosition, bakeries, candidateLimit);

    if (closestCandidates.length === 0) {
        return null;
    }

    let best = null;
    let lastErrorCode = 'routing_failed';

    for (const bakery of closestCandidates) {
        try {
            const candidate = await getWalkingRoute(userPosition, bakery);

            if (!best || candidate.route.distance < best.route.distance) {
                best = candidate;
            }
        } catch (error) {
            lastErrorCode = error.message === 'routing_rate_limit' ? 'routing_rate_limit' : 'routing_failed';
        }
    }

    if (best) {
        return {
            result: best,
            approximate: false,
            errorCode: ''
        };
    }

    return {
        result: createApproximateRouteResult(userPosition, closestCandidates[0]),
        approximate: true,
        errorCode: lastErrorCode
    };
}

function buildClosedBakeryReference(bakery) {
    if (!bakery) {
        return '';
    }

    return `${bakery.name}\n${bakery.adresse}\n${bakery.popup.join('\n')}`;
}

function buildClosedBakeryMailto(bakery) {
    const subject = 'Signalement fermeture boulangerie - Meilleures baguettes de Paris';
    const body = buildClosedBakeryReference(bakery);

    return `mailto:ecrivez.moi@simonertel.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function getWalkingRoute(userPosition, bakery) {
    const [userLat, userLng] = userPosition;
    const [bakeryLat, bakeryLng] = bakery.coords;
    const cacheKey = `${userLat.toFixed(4)},${userLng.toFixed(4)}|${bakeryLat.toFixed(6)},${bakeryLng.toFixed(6)}`;

    if (routeCache.has(cacheKey)) {
        return routeCache.get(cacheKey);
    }

    const url = `${FOOT_ROUTER_BASE_URL}/route/v1/foot/${userLng},${userLat};${bakeryLng},${bakeryLat}?alternatives=false&overview=full&geometries=geojson&steps=false`;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ROUTE_FETCH_TIMEOUT_MS);
    let response;

    try {
        response = await fetch(url, { signal: controller.signal });
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('routing_failed');
        }
        throw new Error('routing_failed');
    } finally {
        window.clearTimeout(timeout);
    }

    if (response.status === 429) {
        throw new Error('routing_rate_limit');
    }

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

    const result = {
        bakery,
        route,
        snappedStart: [snappedStartLat, snappedStartLng],
        snappedEnd: [snappedEndLat, snappedEndLng]
    };

    routeCache.set(cacheKey, result);
    return result;
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

const BakeryMap = () => {
    const { pins, dm, setDm, warning, rankselected, setWarning, routing, setRouting, dictionary, closedBakeryReport, setClosedBakeryReport } = useContext(PinContext);

    const routePoints = routing.route
        ? routing.route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        : [];
    const goldRoutePoints = routing.goldRoute
        ? routing.goldRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        : [];
    const shouldCompareGoldRoute = rankselected === 0 || rankselected === 1;
    const showGoldRoute = Boolean(
        shouldCompareGoldRoute
        &&
        routing.goldRoute
        && routing.goldDestination
        && (
            !routing.destination
            || routing.goldDestination.adresse !== routing.destination.adresse
        )
    );

    function clearWalkRoute() {
        setRouting({
            loading: false,
            error: '',
            tooFar: false,
            route: null,
            destination: null,
            goldRoute: null,
            goldDestination: null,
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
        const goldBakeries = shouldCompareGoldRoute
            ? Object.values(getBakeriesForSelection(0, 1, dictionary, false))
            : [];

        if (bakeries.length === 0) {
            setRouting({
                loading: false,
                error: 'walkRouteNoBakery',
                tooFar: false,
                route: null,
                destination: null,
                approximate: false,
                fallbackDistance: null,
                goldRoute: null,
                goldDestination: null,
                goldApproximate: false,
                goldFallbackDistance: null,
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
                approximate: false,
                fallbackDistance: null,
                goldRoute: null,
                goldDestination: null,
                goldApproximate: false,
                goldFallbackDistance: null,
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
            approximate: false,
            fallbackDistance: null,
            goldRoute: null,
            goldDestination: null,
            goldApproximate: false,
            goldFallbackDistance: null,
            userPosition: null
        });

        navigator.geolocation.getCurrentPosition(async ({ coords: position }) => {
            const userPosition = [position.latitude, position.longitude];

            try {
                const bestOutcome = await findBestWalkingRoute(userPosition, bakeries, MAX_ROUTE_CANDIDATES);

                if (!bestOutcome || !bestOutcome.result) {
                    throw new Error('routing_missing');
                }

                const best = bestOutcome.result;

                if (!bestOutcome.approximate && best.route.duration > MAX_WALKING_DURATION_SECONDS) {
                    setRouting({
                        loading: false,
                        error: '',
                        tooFar: true,
                        route: null,
                        destination: null,
                        approximate: false,
                        fallbackDistance: null,
                        goldRoute: null,
                        goldDestination: null,
                        goldApproximate: false,
                        goldFallbackDistance: null,
                        userPosition: null
                    });
                    return;
                }

                let bestGold = null;
                let bestGoldApproximate = false;
                let bestGoldFallbackDistance = null;

                if (shouldCompareGoldRoute && best.bakery.rank === 0) {
                    bestGold = best;
                    bestGoldApproximate = bestOutcome.approximate;
                    bestGoldFallbackDistance = bestOutcome.approximate ? best.approximateDistance : null;
                } else if (shouldCompareGoldRoute && goldBakeries.length > 0) {
                    const bestGoldOutcome = await findBestWalkingRoute(userPosition, goldBakeries, MAX_GOLD_ROUTE_CANDIDATES);
                    bestGold = bestGoldOutcome ? bestGoldOutcome.result : null;
                    bestGoldApproximate = bestGoldOutcome ? bestGoldOutcome.approximate : false;
                    bestGoldFallbackDistance = bestGoldOutcome && bestGoldOutcome.approximate ? bestGoldOutcome.result.approximateDistance : null;
                }

                setRouting({
                    loading: false,
                    error: '',
                    tooFar: false,
                    route: bestOutcome.approximate ? null : best.route,
                    destination: best.bakery,
                    approximate: bestOutcome.approximate,
                    fallbackDistance: bestOutcome.approximate ? best.approximateDistance : null,
                    goldRoute: shouldCompareGoldRoute && bestGold && !bestGoldApproximate && bestGold.route.duration <= MAX_WALKING_DURATION_SECONDS ? bestGold.route : null,
                    goldDestination: shouldCompareGoldRoute && bestGold ? bestGold.bakery : null,
                    goldApproximate: shouldCompareGoldRoute ? bestGoldApproximate : false,
                    goldFallbackDistance: shouldCompareGoldRoute ? bestGoldFallbackDistance : null,
                    userPosition: bestOutcome.approximate ? userPosition : best.snappedStart
                });
            } catch (error) {
                setRouting({
                    loading: false,
                    error: error.message === 'routing_rate_limit' ? 'walkRouteRateLimit' : 'walkRouteError',
                    tooFar: false,
                    route: null,
                    destination: null,
                    approximate: false,
                    fallbackDistance: null,
                    goldRoute: null,
                    goldDestination: null,
                    goldApproximate: false,
                    goldFallbackDistance: null,
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
                approximate: false,
                fallbackDistance: null,
                goldRoute: null,
                goldDestination: null,
                goldApproximate: false,
                goldFallbackDistance: null,
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
            approximate: false,
            fallbackDistance: null,
            goldRoute: null,
            goldDestination: null,
            goldApproximate: false,
            goldFallbackDistance: null,
            userPosition: null
        });
    }, [pins, rankselected, setRouting]);

    const mapsDirectionUrl = routing.destination && routing.userPosition
        ? `https://www.google.com/maps/dir/?api=1&origin=${routing.userPosition[0]},${routing.userPosition[1]}&destination=${encodeURIComponent(routing.destination.adresse)}&travelmode=walking`
        : null;
    const goldMapsDirectionUrl = routing.goldDestination && routing.userPosition
        ? `https://www.google.com/maps/dir/?api=1&origin=${routing.userPosition[0]},${routing.userPosition[1]}&destination=${encodeURIComponent(routing.goldDestination.adresse)}&travelmode=walking`
        : null;

    return (
        <div className="App">
            {dm === true &&
                <div className={"modal"} onClick={() => setDm(false)}>
                    <Modalcontent />
                </div>
            }
            {routing.tooFar === true &&
                <div className={"modal"} onClick={clearWalkRoute}>
                    <div className="innerModal" onClick={(event) => event.stopPropagation()}>
                        <div title="Fermer" onClick={clearWalkRoute} className="close"></div>
                        <h2><Text tid="walkRouteSummary" /></h2>
                        <p><Text tid="walkRouteTooFar" /></p>
                    </div>
                </div>
            }
            {closedBakeryReport &&
                <div className={"modal"} onClick={closeClosedBakeryReport}>
                    <div className="innerModal" onClick={(event) => event.stopPropagation()}>
                        <div title="Fermer" onClick={closeClosedBakeryReport} className="close"></div>
                        <h2><Text tid="closedBakeryReportTitle" /></h2>
                        <p><Text tid="closedBakeryReportText" /></p>
                        <p className="closed-bakery-report__email">
                            <a href={buildClosedBakeryMailto(closedBakeryReport)}>ecrivez.moi@simonertel.net</a>
                        </p>
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
                {(routing.loading || routing.error || routing.destination || routing.goldDestination) && !routing.tooFar && (
                    <div className="walk-routing__panel">
                        {routing.loading && <p><Text tid="walkRouteLoading" /></p>}
                        {!routing.loading && routing.error && <p><Text tid={routing.error} /></p>}
                        {!routing.loading && routing.destination && (
                            <Fragment>
                                <div className="walk-routing__results">
                                    <RouteCard
                                        title={dictionary.walkRouteSummary || 'Boulangerie la plus proche a pied'}
                                        name={routing.destination.name}
                                        address={routing.destination.adresse}
                                        distance={formatDistance(routing.route ? routing.route.distance : routing.fallbackDistance)}
                                        duration={routing.route ? formatDuration(routing.route.duration) : ''}
                                        approximate={routing.approximate}
                                        approximateLabel={dictionary.walkRouteApproximate || 'Itineraire indisponible, distance approximate a vol d\'oiseau.'}
                                        mapsDirectionUrl={mapsDirectionUrl}
                                    />
                                    {routing.goldDestination && (
                                        <RouteCard
                                            title={dictionary.walkRouteGoldSummary || 'Boulangerie 1er prix la plus proche a pied'}
                                            name={routing.goldDestination.name}
                                            address={routing.goldDestination.adresse}
                                            distance={formatDistance(routing.goldRoute ? routing.goldRoute.distance : routing.goldFallbackDistance)}
                                            duration={routing.goldRoute ? formatDuration(routing.goldRoute.duration) : ''}
                                            approximate={routing.goldApproximate}
                                            approximateLabel={dictionary.walkRouteApproximate || 'Itineraire indisponible, distance approximate a vol d\'oiseau.'}
                                            mapsDirectionUrl={goldMapsDirectionUrl}
                                            accentClassName="walk-routing__card--gold"
                                        />
                                    )}
                                </div>
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
                {showGoldRoute && (
                    <Fragment>
                        <Polyline
                            pathOptions={{ color: '#5c4a00', weight: 8, opacity: 0.45, dashArray: '10 10' }}
                            positions={goldRoutePoints}
                        />
                        <Polyline
                            pathOptions={{ color: '#ffeb3b', weight: 4, opacity: 0.98, dashArray: '10 10' }}
                            positions={goldRoutePoints}
                        />
                    </Fragment>
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

export default BakeryMap;
