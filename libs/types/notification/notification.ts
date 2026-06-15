import { NotificationType, NotificationGroup, NotificationStatus } from '../../enums/notification.enum';

export interface Notification {
	_id: string;
	notificationType: NotificationType;
	notificationGroup: NotificationGroup;
	notificationStatus: NotificationStatus;
	notificationTitle: string;
	notificationDesc?: string | null;
	authorId: string;
	productId?: string | null;
	articleId?: string | null;
	commentId?: string | null;
	refId?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Notifications {
	list: Notification[];
	total: number;
}

export interface CreateNotificationInput {
	notificationType: NotificationType;
	notificationGroup: NotificationGroup;
	notificationTitle: string;
	notificationDesc?: string | null;
	authorId: string;
	receiverId: string;
	productId?: string | null;
	articleId?: string | null;
	commentId?: string | null;
	refId?: string | null;
}

export interface NotificationSearchInput {
	notificationType?: NotificationType;
	ownerId?: string;
}

export interface NotificationsInquiry {
	page: number;
	limit: number;
	search?: NotificationSearchInput;
}

export interface DeleteNotification {
	id: string;
	deleteNotification: {
		success: boolean;
		message: string;
	};
}
