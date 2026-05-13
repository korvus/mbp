import { MapContainer, TileLayer, useMap, useMapEvent, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import React, { Fragment, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import coords from '../datas/datas.json';
import { IconGold, IconSilver, IconDefault } from '../components/icon.js';
import { PinContext, Text, isReactSnap } from '../store';
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
const BAGUETTE_TRADITION_LENGTH_METERS = 0.55;
const BAGUETTES_PRODUCED_PER_YEAR_FRANCE = 6000000000;
const MINUTES_PER_YEAR = 365 * 24 * 60;
const BAGUETTES_PRODUCED_PER_MINUTE_FRANCE = BAGUETTES_PRODUCED_PER_YEAR_FRANCE / MINUTES_PER_YEAR;
const BAGUETTE_SOURCE_URL = 'https://www.info.gouv.fr/actualite/la-baguette-de-pain-patrimoine-culturel-immateriel-de-lhumanite';
const BAGUETTE_CALORIES_SOURCE_URL = 'https://www.anses.fr/fr/content/la-table-de-composition-nutritionnelle-du-ciqual';
const WALKING_CALORIES_SOURCE_URL = 'https://sites.google.com/site/compendiumofphysicalactivities/help/unit-conversions';
const ASSUMED_WALKER_WEIGHT_KG = 70;
const ASSUMED_WALKING_SPEED_M_PER_MIN = 80;

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

function formatLocalizedNumber(value, language, options = {}) {
    try {
        return new Intl.NumberFormat(language || 'fr', options).format(value);
    } catch (error) {
        return new Intl.NumberFormat('fr', options).format(value);
    }
}

function formatTraditionDistance(distance, language, dictionary) {
    const traditionCount = distance / BAGUETTE_TRADITION_LENGTH_METERS;
    const roundedCount = traditionCount >= 100 ? Math.round(traditionCount) : traditionCount;
    const formattedCount = formatLocalizedNumber(
        roundedCount,
        language,
        traditionCount >= 100
            ? { maximumFractionDigits: 0 }
            : { minimumFractionDigits: 1, maximumFractionDigits: 1 }
    );

    return `${formattedCount} ${dictionary.walkRouteBaguetteShort || 'bag.'}`;
}

function estimateWalkingCalories(distance, durationSeconds) {
    const durationMinutes = durationSeconds && durationSeconds > 0
        ? durationSeconds / 60
        : distance / ASSUMED_WALKING_SPEED_M_PER_MIN;
    const speedMetersPerMinute = durationMinutes > 0
        ? distance / durationMinutes
        : ASSUMED_WALKING_SPEED_M_PER_MIN;
    const oxygenCost = (0.1 * speedMetersPerMinute) + 3.5;
    const mets = oxygenCost / 3.5;
    const calories = mets * ASSUMED_WALKER_WEIGHT_KG * (durationMinutes / 60);

    return Math.max(0, calories);
}

function formatWalkingCalories(distance, durationSeconds, language, dictionary) {
    const calories = estimateWalkingCalories(distance, durationSeconds);
    const formattedCount = formatLocalizedNumber(
        calories,
        language,
        { maximumFractionDigits: 0 }
    );

    return `${formattedCount} ${dictionary.walkRouteCaloriesShort || 'kcal'}`;
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

function formatBaguetteProduction(duration, language, dictionary) {
    const producedCount = (duration / 60) * BAGUETTES_PRODUCED_PER_MINUTE_FRANCE;
    const formattedCount = formatLocalizedNumber(
        producedCount,
        language,
        { maximumFractionDigits: 0 }
    );

    return `${formattedCount} ${dictionary.walkRouteBaguetteShort || 'bag.'}`;
}

function RouteMetricIcon({ type }) {
    if (type === 'baguette') {
        return (
            <svg aria-hidden="true" viewBox="0 0 64 24">
                <g transform="translate(32 12) rotate(-24) translate(-32 -12)">
                    <rect x="4" y="4" width="56" height="16" rx="8" fill="#f0c25f" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M18 7.5c2.2 0 3.8 1.3 5 3.2 1 1.5 2.1 2.6 4.4 2.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
                    <path d="M29.5 7.5c2.2 0 3.8 1.3 5 3.2 1 1.5 2.1 2.6 4.4 2.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
                    <path d="M41 7.5c2.2 0 3.8 1.3 5 3.2 1 1.5 2.1 2.6 4.4 2.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
                </g>
            </svg>
        );
    }

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

    if (type === 'calorie') {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12.2 2.8c.4 2-.4 3.2-1.3 4.4-.9 1.1-1.9 2.3-1.9 4 0 2.2 1.5 3.8 3.7 3.8 2.4 0 4.2-1.8 4.2-4.5 0-2-1.1-3.8-2.6-5.7-.8-1-1.6-1.8-2.1-3.2z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                <path d="M10.7 12.1c0 1.6 1 2.7 2.4 2.7 1.5 0 2.6-1.2 2.6-3 0-.9-.3-1.6-.9-2.5-.3.9-.9 1.4-1.4 1.8-.8.7-1.5 1.3-1.7 2.6-.5-.2-1-.8-1-1.6z" fill="currentColor" opacity="0.28" />
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

function RouteMetric({ type, primary, secondaryParts = [] }) {
    const { dictionary } = useContext(PinContext);
    const hasSecondary = secondaryParts.length > 0;
    const buttonRef = useRef(null);
    const tooltipRef = useRef(null);
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);
    const [tooltipPlacement, setTooltipPlacement] = useState('right');
    const [tooltipVerticalPlacement, setTooltipVerticalPlacement] = useState('above');
    const [isMobileTooltip, setIsMobileTooltip] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        function updateViewportMode() {
            setIsMobileTooltip(window.innerWidth <= 640);
        }

        updateViewportMode();
        window.addEventListener('resize', updateViewportMode);

        return () => window.removeEventListener('resize', updateViewportMode);
    }, []);

    useLayoutEffect(() => {
        if (!isTooltipOpen || isMobileTooltip || typeof window === 'undefined' || !buttonRef.current) {
            return undefined;
        }

        function updateTooltipPlacement() {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current
                ? tooltipRef.current.getBoundingClientRect()
                : { width: Math.min(352, window.innerWidth - 32), height: 180 };
            const tooltipWidth = tooltipRect.width;
            const tooltipHeight = tooltipRect.height;
            const viewportPadding = 16;
            const leftEdgeIfAnchoredRight = buttonRect.right - tooltipWidth;
            const rightEdgeIfAnchoredLeft = buttonRect.left + tooltipWidth;
            const overflowIfAnchoredRight = Math.max(0, viewportPadding - leftEdgeIfAnchoredRight);
            const overflowIfAnchoredLeft = Math.max(0, rightEdgeIfAnchoredLeft - (window.innerWidth - viewportPadding));
            const topEdgeIfAbove = buttonRect.top - 4 - tooltipHeight;
            const bottomEdgeIfBelow = buttonRect.bottom + 4 + tooltipHeight;
            const overflowIfAbove = Math.max(0, viewportPadding - topEdgeIfAbove);
            const overflowIfBelow = Math.max(0, bottomEdgeIfBelow - (window.innerHeight - viewportPadding));

            setTooltipPlacement(overflowIfAnchoredRight <= overflowIfAnchoredLeft ? 'right' : 'left');
            setTooltipVerticalPlacement(overflowIfAbove <= overflowIfBelow ? 'above' : 'below');
        }

        updateTooltipPlacement();
        window.addEventListener('resize', updateTooltipPlacement);

        return () => window.removeEventListener('resize', updateTooltipPlacement);
    }, [isMobileTooltip, isTooltipOpen]);

    useEffect(() => {
        if (!isTooltipOpen || !isMobileTooltip || typeof document === 'undefined') {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileTooltip, isTooltipOpen]);

    function openTooltip() {
        setIsTooltipOpen(true);
    }

    function closeTooltip() {
        setIsTooltipOpen(false);
    }

    function toggleTooltip() {
        setIsTooltipOpen((currentValue) => !currentValue);
    }

    return (
        <span className="walk-routing__metric-group">
            <span className={`walk-routing__metric${hasSecondary ? ' walk-routing__metric--split' : ''}`}>
                <span className="walk-routing__metric-icon">
                    <RouteMetricIcon type={type} />
                </span>
                <span className="walk-routing__metric-content">
                    <span className="walk-routing__metric-part">{primary}</span>
                    {hasSecondary && secondaryParts.map((secondaryPart, index) => (
                        <Fragment key={`${type}-${secondaryPart.label}-${index}`}>
                            <span aria-hidden="true" className="walk-routing__metric-divider" />
                            <span className="walk-routing__metric-part walk-routing__metric-part--secondary">
                                {secondaryPart.label}
                                {secondaryPart.iconType && (
                                    <span className={`walk-routing__metric-icon walk-routing__metric-icon--${secondaryPart.iconType}`}>
                                        <RouteMetricIcon type={secondaryPart.iconType} />
                                    </span>
                                )}
                            </span>
                        </Fragment>
                    ))}
                </span>
            </span>
            {hasSecondary && (
                <span
                    className="walk-routing__metric-help"
                    onMouseEnter={!isMobileTooltip ? openTooltip : undefined}
                    onMouseLeave={!isMobileTooltip ? closeTooltip : undefined}
                    onBlur={!isMobileTooltip ? closeTooltip : undefined}
                    onFocus={!isMobileTooltip ? openTooltip : undefined}
                >
                    <button
                        aria-label={
                            type === 'distance'
                                ? (dictionary.walkRouteDistanceInfoLabel || 'About baguette and calorie estimates')
                                : (dictionary.walkRouteDurationInfoLabel || 'About baguette production estimate')
                        }
                        className="walk-routing__metric-help-button"
                        onClick={toggleTooltip}
                        ref={buttonRef}
                        type="button"
                    >
                        ?
                    </button>
                    {isMobileTooltip && isTooltipOpen && (
                        <span className="walk-routing__metric-help-modal" onClick={closeTooltip}>
                            <span className="walk-routing__metric-help-modal-card" onClick={(event) => event.stopPropagation()}>
                                <button
                                    aria-label={dictionary.walkRouteInfoClose || 'Close'}
                                    className="walk-routing__metric-help-modal-close"
                                    onClick={closeTooltip}
                                    type="button"
                                >
                                    ×
                                </button>
                                {type === 'distance' ? (
                                    <span className="walk-routing__metric-help-text walk-routing__metric-help-text--split">
                                        <span className="walk-routing__metric-help-paragraph walk-routing__metric-help-paragraph--baguette">
                                            {dictionary.walkRouteDistanceInfoBaguette || 'The baguette number is the number of baguettes laid end to end to cover that distance. The calculation uses 1 baguette = 55cm.'}
                                        </span>
                                        <span className="walk-routing__metric-help-paragraph walk-routing__metric-help-paragraph--calorie">
                                            {dictionary.walkRouteDistanceInfoCalories || 'The calorie number is a very theoretical estimate of calories burned while walking this route. It assumes flat walking, a 70kg adult, and the route pace when it is known, otherwise an average pace of about 4.8km/h. As a rough reference, one traditional baguette of about 250g is around 700kcal.'}
                                        </span>
                                    </span>
                                ) : (
                                    <span className="walk-routing__metric-help-text">
                                        {dictionary.walkRouteDurationInfo || 'Based on 6 billion baguettes produced each year in France, about 11,416 per minute. We multiply that rate by the walking time.'}
                                    </span>
                                )}
                                {type === 'distance' && (
                                    <span className="walk-routing__metric-help-links">
                                        <a className="walk-routing__metric-help-link" href={BAGUETTE_CALORIES_SOURCE_URL} rel="noreferrer" target="_blank">
                                            {dictionary.walkRouteDistanceInfoSourceBread || 'Baguette calories source'}
                                        </a>
                                        <a className="walk-routing__metric-help-link" href={WALKING_CALORIES_SOURCE_URL} rel="noreferrer" target="_blank">
                                            {dictionary.walkRouteDistanceInfoSourceCalories || 'Walking calories formula'}
                                        </a>
                                    </span>
                                )}
                                {type !== 'distance' && (
                                    <a className="walk-routing__metric-help-link" href={BAGUETTE_SOURCE_URL} rel="noreferrer" target="_blank">
                                        {dictionary.walkRouteInfoSource || 'Government source'}
                                    </a>
                                )}
                            </span>
                        </span>
                    )}
                    {!isMobileTooltip && (
                        <span
                            className={`walk-routing__metric-help-tooltip walk-routing__metric-help-tooltip--${tooltipPlacement} walk-routing__metric-help-tooltip--${tooltipVerticalPlacement}${isTooltipOpen ? ' is-open' : ''}`}
                            ref={tooltipRef}
                            role="tooltip"
                        >
                                {type === 'distance' ? (
                                    <span className="walk-routing__metric-help-text walk-routing__metric-help-text--split">
                                        <span className="walk-routing__metric-help-paragraph walk-routing__metric-help-paragraph--baguette">
                                            {dictionary.walkRouteDistanceInfoBaguette || 'The baguette number is the number of baguettes laid end to end to cover that distance. The calculation uses 1 baguette = 55cm.'}
                                        </span>
                                        <span className="walk-routing__metric-help-paragraph walk-routing__metric-help-paragraph--calorie">
                                            {dictionary.walkRouteDistanceInfoCalories || 'The calorie number is a very theoretical estimate of calories burned while walking this route. It assumes flat walking, a 70kg adult, and the route pace when it is known, otherwise an average pace of about 4.8km/h. As a rough reference, one traditional baguette of about 250g is around 700kcal.'}
                                        </span>
                                    </span>
                                ) : (
                                    <span className="walk-routing__metric-help-text">
                                        {dictionary.walkRouteDurationInfo || 'Based on 6 billion baguettes produced each year in France, about 11,416 per minute. We multiply that rate by the walking time.'}
                                    </span>
                                )}
                                {type === 'distance' && (
                                    <span className="walk-routing__metric-help-links">
                                        <a className="walk-routing__metric-help-link" href={BAGUETTE_CALORIES_SOURCE_URL} rel="noreferrer" target="_blank">
                                            {dictionary.walkRouteDistanceInfoSourceBread || 'Baguette calories source'}
                                        </a>
                                        <a className="walk-routing__metric-help-link" href={WALKING_CALORIES_SOURCE_URL} rel="noreferrer" target="_blank">
                                            {dictionary.walkRouteDistanceInfoSourceCalories || 'Walking calories formula'}
                                        </a>
                                    </span>
                                )}
                                {type !== 'distance' && (
                                    <a className="walk-routing__metric-help-link" href={BAGUETTE_SOURCE_URL} rel="noreferrer" target="_blank">
                                        {dictionary.walkRouteInfoSource || 'Government source'}
                                    </a>
                                )}
	                    </span>
                    )}
                </span>
            )}
        </span>
    );
}

function RouteCard({
    title,
    name,
    address,
    distance,
    distanceSecondaryParts,
    duration,
    durationSecondary,
    approximate,
    approximateLabel,
    mapsDirectionUrl,
    mapsLabel,
    accentClassName = ''
}) {
    return (
        <section className={`walk-routing__card ${accentClassName}`.trim()}>
            <p className="walk-routing__eyebrow">{title}</p>
            <p className="walk-routing__name">{name}</p>
            <p className="walk-routing__address">{address}</p>
            <div className="walk-routing__metrics">
                <RouteMetric primary={distance} secondaryParts={distanceSecondaryParts} type="distance" />
                {duration && (
                    <RouteMetric primary={duration} secondaryParts={durationSecondary ? [{ label: durationSecondary, iconType: 'baguette' }] : []} type="duration" />
                )}
            </div>
            {approximate && <p className="walk-routing__approximate">{approximateLabel}</p>}
            {mapsDirectionUrl && (
                <a className="walk-routing__metric walk-routing__metric--link" href={mapsDirectionUrl} rel="noreferrer" target="_blank">
                    <span className="walk-routing__metric-icon walk-routing__metric-icon--maps">
                        <RouteMetricIcon type="maps" />
                    </span>
                    {mapsLabel}
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

function constructJsx(bakeries, map, openClosedBakeryReport, markerRefs) {
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
                ref={(marker) => {
                    if (!marker) {
                        delete markerRefs.current[bakeryKey];
                        return;
                    }

                    markerRefs.current[bakeryKey] = marker;
                }}
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
    const {
        askedrank,
        dictionary,
        focusedBakeryKey,
        list,
        onBakeryFocusHandled,
        openClosedBakeryReport,
        warning
    } = props;
    const setWarn = warning;
    const markerRefs = useRef({});
    const bakeries = useMemo(
        () => getBakeriesForSelection(list, askedrank, dictionary, true),
        [askedrank, dictionary, list]
    );
    const bakeriesWithMapState = constructJsx(bakeries, map, openClosedBakeryReport, markerRefs);

    useEffect(() => {
        setWarn(bakeriesWithMapState[1] === 0);
    });

    useEffect(() => {
        if (!focusedBakeryKey) {
            return;
        }

        const focusedBakery = bakeries[focusedBakeryKey];
        const focusedMarker = markerRefs.current[focusedBakeryKey];

        if (!focusedBakery || !focusedMarker) {
            return;
        }

        map.flyTo(focusedBakery.coords, Math.max(map.getZoom(), 16), {
            animate: true,
            duration: 0.5
        });
        focusedMarker.openPopup();
        warning(false);
        onBakeryFocusHandled();
    }, [bakeries, focusedBakeryKey, map, onBakeryFocusHandled, warning]);

    useMapEvent('drag', () => {
        const updated = constructJsx(bakeries, map, openClosedBakeryReport, markerRefs);
        warning(updated[1] === 0);
    });

    useMapEvent('zoomend', () => {
        const updated = constructJsx(bakeries, map, openClosedBakeryReport, markerRefs);
        warning(updated[1] === 0);
    });

    return (
        <Fragment>
            {bakeriesWithMapState[0]}
        </Fragment>
    );
}

const BakeryMap = () => {
    const {
        pins,
        dm,
        setDm,
        warning,
        rankselected,
        setWarning,
        routing,
        setRouting,
        dictionary,
        closedBakeryReport,
        setClosedBakeryReport,
        focusedBakeryKey,
        setFocusedBakeryKey,
        userLanguage
    } = useContext(PinContext);

    const routePoints = routing.route
        ? routing.route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        : [];
    const goldRoutePoints = routing.goldRoute
        ? routing.goldRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        : [];
    const shouldRenderTileLayer = !isReactSnap();
    const shouldCompareGoldRoute = rankselected === 0 || rankselected === 1;
    const [routingPanelCollapsed, setRoutingPanelCollapsed] = useState(false);
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
        setRoutingPanelCollapsed(false);
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
            setRoutingPanelCollapsed(false);
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
            setRoutingPanelCollapsed(false);
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

        setRoutingPanelCollapsed(false);
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
                    setRoutingPanelCollapsed(false);
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

                setRoutingPanelCollapsed(false);
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
                setRoutingPanelCollapsed(false);
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
            setRoutingPanelCollapsed(false);
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
        setRoutingPanelCollapsed(false);
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
                    <Modalcontent onRequestWalkRoute={handleWalkRoute} />
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
                    <div className={`walk-routing__panel${routingPanelCollapsed ? ' walk-routing__panel--collapsed' : ''}`}>
                        {!routing.loading && (routing.destination || routing.goldDestination || routing.error) && (
                            <div className="walk-routing__panel-actions">
                                <button
                                    className="walk-routing__toggle"
                                    onClick={() => setRoutingPanelCollapsed((current) => !current)}
                                    type="button"
                                    aria-expanded={!routingPanelCollapsed}
                                >
                                    <Text tid={routingPanelCollapsed ? 'walkRouteExpand' : 'walkRouteCollapse'} />
                                </button>
                            </div>
                        )}
                        {routing.loading && <p><Text tid="walkRouteLoading" /></p>}
                        {!routing.loading && routing.error && <p><Text tid={routing.error} /></p>}
                        {!routing.loading && routing.destination && !routingPanelCollapsed && (
                            <Fragment>
                                <div className="walk-routing__results">
                                    <RouteCard
                                        title={dictionary.walkRouteSummary || 'Boulangerie la plus proche a pied'}
                                        name={routing.destination.name}
                                        address={routing.destination.adresse}
                                        distance={formatDistance(routing.route ? routing.route.distance : routing.fallbackDistance)}
                                        distanceSecondaryParts={[
                                            {
                                                label: formatTraditionDistance(
                                                    routing.route ? routing.route.distance : routing.fallbackDistance,
                                                    userLanguage,
                                                    dictionary
                                                ),
                                                iconType: 'baguette'
                                            },
                                            {
                                                label: formatWalkingCalories(
                                                    routing.route ? routing.route.distance : routing.fallbackDistance,
                                                    routing.route ? routing.route.duration : null,
                                                    userLanguage,
                                                    dictionary
                                                ),
                                                iconType: 'calorie'
                                            }
                                        ]}
                                        duration={routing.route ? formatDuration(routing.route.duration) : ''}
                                        durationSecondary={routing.route ? formatBaguetteProduction(routing.route.duration, userLanguage, dictionary) : ''}
                                        approximate={routing.approximate}
                                        approximateLabel={dictionary.walkRouteApproximate || 'Itineraire indisponible, distance approximate a vol d\'oiseau.'}
                                        mapsDirectionUrl={mapsDirectionUrl}
                                        mapsLabel={dictionary.walkRouteOpen || 'Open in Google Maps'}
                                    />
                                    {routing.goldDestination && (
                                        <RouteCard
                                            title={dictionary.walkRouteGoldSummary || 'Boulangerie 1er prix la plus proche a pied'}
                                            name={routing.goldDestination.name}
                                            address={routing.goldDestination.adresse}
                                            distance={formatDistance(routing.goldRoute ? routing.goldRoute.distance : routing.goldFallbackDistance)}
                                            distanceSecondaryParts={[
                                                {
                                                    label: formatTraditionDistance(
                                                        routing.goldRoute ? routing.goldRoute.distance : routing.goldFallbackDistance,
                                                        userLanguage,
                                                        dictionary
                                                    ),
                                                    iconType: 'baguette'
                                                },
                                                {
                                                    label: formatWalkingCalories(
                                                        routing.goldRoute ? routing.goldRoute.distance : routing.goldFallbackDistance,
                                                        routing.goldRoute ? routing.goldRoute.duration : null,
                                                        userLanguage,
                                                        dictionary
                                                    ),
                                                    iconType: 'calorie'
                                                }
                                            ]}
                                            duration={routing.goldRoute ? formatDuration(routing.goldRoute.duration) : ''}
                                            durationSecondary={routing.goldRoute ? formatBaguetteProduction(routing.goldRoute.duration, userLanguage, dictionary) : ''}
                                            approximate={routing.goldApproximate}
                                            approximateLabel={dictionary.walkRouteApproximate || 'Itineraire indisponible, distance approximate a vol d\'oiseau.'}
                                            mapsDirectionUrl={goldMapsDirectionUrl}
                                            mapsLabel={dictionary.walkRouteOpen || 'Open in Google Maps'}
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
                {shouldRenderTileLayer && (
                    <TileLayer
                        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                )}
                <ListMarkers
                    list={pins}
                    warning={setWarning}
                    askedrank={rankselected}
                    dictionary={dictionary}
                    focusedBakeryKey={focusedBakeryKey}
                    onBakeryFocusHandled={() => setFocusedBakeryKey(null)}
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
