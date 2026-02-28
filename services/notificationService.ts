/**
 * Notification Service
 *
 * Uses expo-notifications for local push notifications.
 * Lazy-loads the module to avoid Expo Go initialization errors.
 */

import { Platform } from 'react-native';
import * as db from './database';

let Notifications: typeof import('expo-notifications') | null = null;
let isConfigured = false;

async function getNotifications() {
    if (!Notifications) {
        Notifications = await import('expo-notifications');
    }
    if (!isConfigured) {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
        isConfigured = true;
    }
    return Notifications;
}

// ── Permissions ──

export async function requestPermissions(): Promise<boolean> {
    const N = await getNotifications();
    const { status: existingStatus } = await N.getPermissionsAsync();

    if (existingStatus === 'granted') return true;

    const { status } = await N.requestPermissionsAsync();

    if (Platform.OS === 'android') {
        await N.setNotificationChannelAsync('reminders', {
            name: 'Reminders',
            importance: N.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7fff9e',
        });
    }

    return status === 'granted';
}

// ── Schedule a reminder notification ──

export async function scheduleReminder(
    title: string,
    remindAt: string,
    reminderId?: string
): Promise<string | null> {
    try {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            console.warn('[notifications] Permission denied');
            return null;
        }

        const N = await getNotifications();
        const triggerDate = new Date(remindAt);
        const now = new Date();

        if (triggerDate <= now) {
            console.warn('[notifications] Reminder time already passed:', remindAt);
            return null;
        }

        const secondsUntil = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);

        const notificationId = await N.scheduleNotificationAsync({
            content: {
                title: '🔔 Reminder',
                body: title,
                data: { reminderId },
                sound: true,
            },
            trigger: {
                type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: secondsUntil,
            },
        });

        if (reminderId) {
            await db.updateReminderNotificationId(reminderId, notificationId);
        }

        console.log(`[notifications] Scheduled "${title}" in ${secondsUntil}s (id: ${notificationId})`);
        return notificationId;
    } catch (error) {
        console.warn('[notifications] Failed to schedule:', error);
        return null;
    }
}

// ── Cancel a notification ──

export async function cancelReminder(notificationId: string): Promise<void> {
    try {
        const N = await getNotifications();
        await N.cancelScheduledNotificationAsync(notificationId);
        console.log(`[notifications] Cancelled notification: ${notificationId}`);
    } catch (error) {
        console.warn('[notifications] Failed to cancel:', error);
    }
}

// ── Cancel and reschedule (for corrections) ──

export async function rescheduleReminder(
    oldNotificationId: string | null,
    title: string,
    newRemindAt: string,
    reminderId?: string
): Promise<string | null> {
    if (oldNotificationId) {
        await cancelReminder(oldNotificationId);
    }
    return scheduleReminder(title, newRemindAt, reminderId);
}
