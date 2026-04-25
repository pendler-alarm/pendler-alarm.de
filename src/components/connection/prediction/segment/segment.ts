import type { $ConnectionSegment, ConnectionSegment } from '@/features/motis/routing-service.d';
import type { RouteStopEntry } from '../../ConnectionRouteDetail/ConnectionRouteDetail.d';
import type { IN_OUT } from './segment.d';
/**
 * 🎯 Get stop by index.
 * @param {RouteStopEntry[]} routeStops ➡️ List of route stops.
 * @param {RouteStopEntry} stop ➡️ Stop to find index for.
 * @returns {number} 📤 Index of the stop in the route stops list, or -1 if not found.
 */
export const getStopIndex = (routeStops: RouteStopEntry[], stop: RouteStopEntry): number => {
    let index = -1;
    if (!stop) return index;
    for (let i = 0; i < routeStops.length; i++) {
        const found = routeStops[i];
        if (found && found.key === stop.key) {
            index = i;
            break;
        }
    }
    return index;
};
/**
 * 🎯 Check if a segment is a walk segment
 * @param { $ConnectionSegment } segment ➡️ Segment to check.
 * @returns { boolean } 📤 True if the segment is a walk segment, false otherwise.
 */

export const isWalk = (segment: $ConnectionSegment): boolean => segment?.productType === 'walk';
/**
 * 🎯 Get the segment of a stop by direction.
 * @param {RouteStopEntry} stop ➡️ Stop to get the segment for.
 * @param {IN_OUT} direction ➡️ Direction of the segment ('incoming' or 'outgoing').
 * @returns {ConnectionSegment} 📤 The segment in the specified direction.
 */
export const getSegmentByDirection = (stop: RouteStopEntry, direction: IN_OUT): ConnectionSegment => {
    return direction === 'incoming' ? stop.incomingSegment : stop.outgoingSegment;
};
const getTransitSegment = (
    routeStops: RouteStopEntry[],
    stop: RouteStopEntry,
    direction: IN_OUT,
): $ConnectionSegment => {
    const segment = getSegmentByDirection(stop, direction);
    if (!isWalk(segment)) {
        return segment;
    }

    const index = getStopIndex(routeStops, stop);
    const adjacentStop = routeStops[direction === 'incoming' ? index - 1 : index + 1] ?? null;

    if (!adjacentStop) {
        return null;
    }

    const adjacentSegment = getSegmentByDirection(adjacentStop, direction);
    if (!isWalk(adjacentSegment)) {
        return adjacentSegment;
    }

    return null;
};
/**
 * 🎯 Get the transit segment related to a stop, checking adjacent stops if the direct segment is a walk.
 * @param {RouteStopEntry[]} routeStops ➡️ List of route stops.
 * @param {RouteStopEntry} stop ➡️ Stop to get the transit segment for.
 * @returns {$ConnectionSegment} 📤 The transit segment, or null if not found.
 */
export const getTransitIncomingSegment = (
    routeStops: RouteStopEntry[],
    stop: RouteStopEntry,
): $ConnectionSegment => {
    return getTransitSegment(routeStops, stop, 'incoming');
};
/**
 * 🎯 Get the transit segment related to a stop, checking adjacent stops if the direct segment is a walk.
 * @param {RouteStopEntry[]} routeStops ➡️ List of route stops.
 * @param {RouteStopEntry} stop ➡️ Stop to get the transit segment for.
 * @returns {$ConnectionSegment} 📤 The transit segment, or null if not found.
 */
export const getTransitOutgoingSegment = (
    routeStops: RouteStopEntry[],
    stop: RouteStopEntry,
): $ConnectionSegment => {
    return getTransitSegment(routeStops, stop, 'outgoing');
};