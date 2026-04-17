import { useEffect, useRef } from 'react';
import { NOTIFICATION_REFRESH_EVENT } from '../utils/notificationEvents';

const DEFAULT_INTERVAL_MS = 10000;

const useNotificationRefresh = (refresh, options = {}) => {
    const refreshRef = useRef(refresh);
    const intervalMs = options.intervalMs || DEFAULT_INTERVAL_MS;
    const enabled = options.enabled !== false;

    useEffect(() => {
        refreshRef.current = refresh;
    }, [refresh]);

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }

        const runRefresh = () => {
            if (typeof refreshRef.current === 'function') {
                refreshRef.current();
            }
        };

        runRefresh();

        const intervalId = window.setInterval(runRefresh, intervalMs);
        const handleFocus = () => runRefresh();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                runRefresh();
            }
        };
        const handleNotificationEvent = () => runRefresh();

        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener(NOTIFICATION_REFRESH_EVENT, handleNotificationEvent);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener(NOTIFICATION_REFRESH_EVENT, handleNotificationEvent);
        };
    }, [enabled, intervalMs]);
};

export default useNotificationRefresh;