export const NOTIFICATION_REFRESH_EVENT = 'inventory-tracker:notifications-changed';

export const dispatchNotificationRefresh = () => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new Event(NOTIFICATION_REFRESH_EVENT));
};