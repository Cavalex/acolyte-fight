import * as s from './store.model';
import * as w from '../game/world.model';
import { getCurrentWorld } from './facade';

const ExpiryMilliseconds = 15000;

let nextNotificationId = 0;
let store: s.Store = {
    world: getCurrentWorld(),
    items: [],
    disconnected: false,
};

setInterval(notificationCleanup, 1000);

export function getStore() {
    return store;
}

export function applyNotificationsToStore(newNotifications: w.Notification[]) {
    // Detect if entered a new game
    newNotifications.forEach(n => {
        if (n.type === "new") {
            store.world = getCurrentWorld();
            store.items = [];
        } else if (n.type === "disconnected") {
            store.disconnected = true;
        }
    });

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
    store.items = newItems;
}

function calculateExpiryMilliseconds(notification: w.Notification): number {
    switch (notification.type) {
        case "win": return 1e9;
        case "disconnected": return 1e9;
        default: return ExpiryMilliseconds;
    }
}


function notificationCleanup() {
    if (store.items.length === 0) {
        return;
    }

    const now = new Date().getTime();
    let items = new Array<s.NotificationItem>();
    store.items.forEach(item => {
        if (item.expiryTime > now) {
            items.push(item);
        }
    });
    store.items = items;
}