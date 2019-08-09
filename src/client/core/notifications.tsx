import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';

export interface NotificationListener {
    (newNotifications: w.Notification[]): void;
}

const ExpireInterval = 1000;
const ExpiryMilliseconds = 15000;
const RatingAdjustmentMilliseconds = 30000;
const TeamsSplashMilliseconds = 4000;
const TextMilliseconds = 60000;

const listeners = new Array<NotificationListener>();
let nextNotificationId = 0;

export function startTimers() {
    setInterval(notificationCleanup, ExpireInterval);
}

export function attachListener(listener: NotificationListener) {
    listeners.push(listener);
}

export function notify(...newNotifications: w.Notification[]) {
    const store = StoreProvider.getState();

    // Add notifications to list
    const now = new Date().getTime();
    const newItems = [...store.items];
    newNotifications.forEach(notification => {
        const expiryTime = now + calculateExpiryMilliseconds(notification);
        newItems.push({ 
            key: "item" + (nextNotificationId++),
            notification,
            expiryTime,
         });
    });

    StoreProvider.dispatch({ type: "updateNotifications", items: newItems });

    listeners.forEach(listener => listener(newNotifications));
}

function calculateExpiryMilliseconds(notification: w.Notification): number {
    switch (notification.type) {
        case "win": return 1e9;
        case "disconnected": return 1e9;
        case "teams": return TeamsSplashMilliseconds;
        case "text": return TextMilliseconds;
        case "ratingAdjustment": return RatingAdjustmentMilliseconds;
        default: return ExpiryMilliseconds;
    }
}

function notificationCleanup() {
    const store = StoreProvider.getState();

    if (store.items.length === 0) {
        return;
    }

    const now = new Date().getTime();
    const items = store.items.filter(item => item.expiryTime > now);
    if (items.length < store.items.length) {
        StoreProvider.dispatch({ type: "updateNotifications", items });
    }
}