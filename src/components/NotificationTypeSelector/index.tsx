import { sortBy } from 'lodash';
import React, { useMemo } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useSettings from '../../hooks/useSettings';
import { Permission, User, useUser } from '../../hooks/useUser';
import NotificationType from './NotificationType';

const messages = defineMessages({
  notificationTypes: 'Notification Types',
  mediarequested: 'Media Requested',
  mediarequestedDescription:
    'Send notifications when users submit new media requests which require approval.',
  usermediarequestedDescription:
    'Get notified when users submit new media requests which require approval.',
  mediaapproved: 'Media Approved',
  mediaapprovedDescription:
    'Send notifications when media requests are manually approved.',
  usermediaapprovedDescription:
    'Get notified when your media requests are approved.',
  mediaAutoApproved: 'Media Automatically Approved',
  mediaAutoApprovedDescription:
    'Send notifications when media requests are automatically approved.',
  usermediaAutoApprovedDescription:
    'Get notified when media requests are automatically approved.',
  mediaavailable: 'Media Available',
  mediaavailableDescription:
    'Send notifications when media requests become available.',
  usermediaavailableDescription:
    'Get notified when your media requests become available.',
  mediafailed: 'Media Failed',
  mediafailedDescription:
    'Send notifications when media requests fail to be added to Radarr or Sonarr.',
  usermediafailedDescription:
    'Get notified when media requests fail to be added to Radarr or Sonarr.',
  mediadeclined: 'Media Declined',
  mediadeclinedDescription:
    'Send notifications when media requests are declined.',
  usermediadeclinedDescription:
    'Get notified when your media requests are declined.',
});

export const hasNotificationType = (
  types: Notification | Notification[],
  value: number
): boolean => {
  let total = 0;

  // If we are not checking any notifications, bail out and return true
  if (types === 0) {
    return true;
  }

  if (Array.isArray(types)) {
    // Combine all notification values into one
    total = types.reduce((a, v) => a + v, 0);
  } else {
    total = types;
  }

  // Test notifications don't need to be enabled
  if (!(value & Notification.TEST_NOTIFICATION)) {
    value += Notification.TEST_NOTIFICATION;
  }

  return !!(value & total);
};

export enum Notification {
  MEDIA_PENDING = 2,
  MEDIA_APPROVED = 4,
  MEDIA_AVAILABLE = 8,
  MEDIA_FAILED = 16,
  TEST_NOTIFICATION = 32,
  MEDIA_DECLINED = 64,
  MEDIA_AUTO_APPROVED = 128,
}

export const ALL_NOTIFICATIONS = Object.values(Notification)
  .filter((v) => !isNaN(Number(v)))
  .reduce((a, v) => a + Number(v), 0);

export interface NotificationItem {
  id: string;
  name: string;
  description: string;
  value: Notification;
  hasNotifyUser?: boolean;
  children?: NotificationItem[];
  hidden?: boolean;
}

interface NotificationTypeSelectorProps {
  user?: User;
  enabledTypes?: number;
  currentTypes: number;
  onUpdate: (newTypes: number) => void;
  disabled?: boolean;
  error?: string;
}

const NotificationTypeSelector: React.FC<NotificationTypeSelectorProps> = ({
  user,
  enabledTypes = ALL_NOTIFICATIONS,
  currentTypes,
  onUpdate,
  disabled = false,
  error,
}) => {
  const intl = useIntl();
  const settings = useSettings();
  const { hasPermission } = useUser({ id: user?.id });

  const availableTypes = useMemo(() => {
    const allRequestsAutoApproved =
      user &&
      // Has Manage Requests perm, which grants all Auto-Approve perms
      (hasPermission(Permission.MANAGE_REQUESTS) ||
        // Cannot submit requests
        !hasPermission(Permission.REQUEST) ||
        // Has Auto-Approve perms for non-4K movies & series
        ((hasPermission(Permission.AUTO_APPROVE) ||
          hasPermission([
            Permission.AUTO_APPROVE_MOVIE,
            Permission.AUTO_APPROVE_TV,
          ])) &&
          // Cannot submit 4K movie requests OR has Auto-Approve perms for 4K movies
          (!settings.currentSettings.movie4kEnabled ||
            !hasPermission(
              [Permission.REQUEST_4K, Permission.REQUEST_4K_MOVIE],
              { type: 'or' }
            ) ||
            hasPermission(
              [Permission.AUTO_APPROVE_4K, Permission.AUTO_APPROVE_4K_MOVIE],
              { type: 'or' }
            )) &&
          // Cannot submit 4K series requests OR has Auto-Approve perms for 4K series
          (!settings.currentSettings.series4kEnabled ||
            !hasPermission([Permission.REQUEST_4K, Permission.REQUEST_4K_TV], {
              type: 'or',
            }) ||
            hasPermission(
              [Permission.AUTO_APPROVE_4K, Permission.AUTO_APPROVE_4K_TV],
              { type: 'or' }
            ))));

    const types: NotificationItem[] = [
      {
        id: 'media-requested',
        name: intl.formatMessage(messages.mediarequested),
        description: intl.formatMessage(
          user
            ? messages.usermediarequestedDescription
            : messages.mediarequestedDescription
        ),
        value: Notification.MEDIA_PENDING,
        hidden: user && !hasPermission(Permission.MANAGE_REQUESTS),
      },
      {
        id: 'media-auto-approved',
        name: intl.formatMessage(messages.mediaAutoApproved),
        description: intl.formatMessage(
          user
            ? messages.usermediaAutoApprovedDescription
            : messages.mediaAutoApprovedDescription
        ),
        value: Notification.MEDIA_AUTO_APPROVED,
        hidden: user && !hasPermission(Permission.MANAGE_REQUESTS),
      },
      {
        id: 'media-approved',
        name: intl.formatMessage(messages.mediaapproved),
        description: intl.formatMessage(
          user
            ? messages.usermediaapprovedDescription
            : messages.mediaapprovedDescription
        ),
        value: Notification.MEDIA_APPROVED,
        hasNotifyUser: true,
        hidden: allRequestsAutoApproved,
      },
      {
        id: 'media-declined',
        name: intl.formatMessage(messages.mediadeclined),
        description: intl.formatMessage(
          user
            ? messages.usermediadeclinedDescription
            : messages.mediadeclinedDescription
        ),
        value: Notification.MEDIA_DECLINED,
        hasNotifyUser: true,
        hidden: allRequestsAutoApproved,
      },
      {
        id: 'media-available',
        name: intl.formatMessage(messages.mediaavailable),
        description: intl.formatMessage(
          user
            ? messages.usermediaavailableDescription
            : messages.mediaavailableDescription
        ),
        value: Notification.MEDIA_AVAILABLE,
        hasNotifyUser: true,
      },
      {
        id: 'media-failed',
        name: intl.formatMessage(messages.mediafailed),
        description: intl.formatMessage(
          user
            ? messages.usermediafailedDescription
            : messages.mediafailedDescription
        ),
        value: Notification.MEDIA_FAILED,
        hidden: user && !hasPermission(Permission.MANAGE_REQUESTS),
      },
    ];

    return user
      ? sortBy(
          types.filter(
            (type) =>
              !type.hidden && hasNotificationType(type.value, enabledTypes)
          ),
          'hasNotifyUser',
          'DESC'
        )
      : types.filter(
          (type) =>
            !type.hidden && hasNotificationType(type.value, enabledTypes)
        );
  }, [intl, user, hasPermission, enabledTypes, settings]);

  return (
    <div
      role="group"
      aria-labelledby="group-label"
      className={`form-group ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="form-row">
        <span id="group-label" className="group-label">
          {intl.formatMessage(messages.notificationTypes)}
          {!user && <span className="label-required">*</span>}
        </span>
        <div className="form-input">
          <div className="max-w-lg">
            {availableTypes.map((type) => (
              <NotificationType
                key={`notification-type-${type.id}`}
                option={type}
                currentTypes={currentTypes}
                onUpdate={onUpdate}
                disabled={disabled}
              />
            ))}
          </div>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default NotificationTypeSelector;
