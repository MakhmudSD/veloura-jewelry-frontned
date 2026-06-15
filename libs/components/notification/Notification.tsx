import React, { UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
	Avatar,
	Badge,
	Box,
	Button,
	CircularProgress,
	Divider,
	IconButton,
	List,
	ListItem,
	ListItemAvatar,
	ListItemText,
	Menu,
	Stack,
	Tooltip,
	Typography,
} from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecordRounded';
import moment from 'moment';
import { useApolloClient, useMutation, useQuery, useReactiveVar } from '@apollo/client';

import { useNotificationWS } from '../../hooks/useNotificationWS';
import { resolveImageUrl } from '../../config';
import { userVar } from '../../../apollo/store';

import {
	MARK_ALL_NOTIFICATIONS_READ,
	MARK_NOTIFICATION_READ,
	GET_NOTIFICATIONS,
	type GetNotificationsData,
	type GetNotificationsVars,
	type MarkNotificationReadData,
	type MarkNotificationReadVars,
	type MarkAllNotificationsReadData,
} from '../../../apollo/user/mutation';

import { NotificationGroup, NotificationStatus, NotificationType } from '../../enums/notification.enum';

const PAGE_LIMIT = 5;
const SOFT_DELETE_ONLY = true;

const buildImgSrc = (img?: string | null) =>
	resolveImageUrl(img, '/img/profile/defaultUser3.svg');

const actionText = (n: any) => {
	switch (n.notificationType as NotificationType) {
		case NotificationType.FOLLOW:
			return 'started following you';
		case NotificationType.LIKE:
			if (n.notificationGroup === NotificationGroup.PRODUCT) return 'liked your product';
			if (n.notificationGroup === NotificationGroup.ARTICLE) return 'liked your article';
			if (n.notificationGroup === NotificationGroup.COMMENT) return 'liked your comment';
			return 'liked your profile';
		case NotificationType.COMMENT:
			if (n.notificationGroup === NotificationGroup.PRODUCT) return 'commented on your product';
			if (n.notificationGroup === NotificationGroup.ARTICLE) return 'commented on your article';
			return 'commented on your post';
		case NotificationType.NEW_PRODUCT:
			return 'added a new product';
		case NotificationType.ORDER:
			return 'placed an order';
		case NotificationType.MESSAGE:
			return 'sent you a message';
		case NotificationType.NOTICE:
			return 'posted a site notice';
		default:
			return 'sent you a notification';
	}
};

const secondaryText = (n: any) => {
	const desc = (n.notificationDesc || '').trim();
	return desc ? `“${desc}”` : null;
};

const hiddenStoreKey = (uid?: string) => (uid ? `veloura:hidden_notifs:${uid}` : 'veloura:hidden_notifs');

const mergeUniqueSorted = (prevList: any[], nextList: any[]) => {
	const map = new Map<string, any>();
	prevList.forEach((n) => map.set(n._id, n));
	nextList.forEach((n) => {
		const prev = map.get(n._id) || {};
		map.set(n._id, { ...prev, ...n });
	});
	return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const NotificationBell: React.FC = () => {
	const user = useReactiveVar(userVar);
	const client = useApolloClient();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const open = Boolean(anchorEl);
	const [page, setPage] = useState(1);
	const [items, setItems] = useState<any[]>([]);
	const [total, setTotal] = useState(0);
	const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
	const [loadingMore, setLoadingMore] = useState(false);
	const listBoxRef = useRef<HTMLDivElement | null>(null);

	/** APOLLO REQUESTS **/
	const { loading, fetchMore, refetch } = useQuery<GetNotificationsData, GetNotificationsVars>(GET_NOTIFICATIONS, {
		variables: { input: { page: 1, limit: PAGE_LIMIT } },
		skip: !user?._id,
		fetchPolicy: 'cache-and-network',
		notifyOnNetworkStatusChange: true,
		onCompleted: (d) => {
			if (!d?.getNotifications) return;
			setPage(1);
			setItems(d.getNotifications.list);
			setTotal(d.getNotifications.total ?? 0);
		},
	});

	const [markOne, { loading: markingOne }] = useMutation<MarkNotificationReadData, MarkNotificationReadVars>(
		MARK_NOTIFICATION_READ,
	);

	const [markAll, { loading: markingAll }] = useMutation<MarkAllNotificationsReadData>(MARK_ALL_NOTIFICATIONS_READ);

	/**LIFECYCLES **/
	useEffect(() => {
		if (!user?._id) return;
		try {
			const raw = localStorage.getItem(hiddenStoreKey(user._id));
			if (raw) {
				const arr: string[] = JSON.parse(raw);
				setHiddenIds(new Set(arr));
			} else {
				setHiddenIds(new Set());
			}
		} catch {
			// ignore
		}
	}, [user?._id]);

	useEffect(() => {
		if (!user?._id) return;
		try {
			localStorage.setItem(hiddenStoreKey(user._id), JSON.stringify(Array.from(hiddenIds)));
		} catch {
			// ignore
		}
	}, [hiddenIds, user?._id]);

	const handleSoftRemove = (id: string) => {
		setHiddenIds((prev) => {
			const next = new Set(prev);
			next.add(id);
			return next;
		});
	};

	// WebSocket connection for real-time updates
	useNotificationWS({
		userId: user?._id,
		client,
		onPing: async () => {
			const res = await refetch({ input: { page: 1, limit: PAGE_LIMIT } });
			setPage(1);
			setItems(res.data?.getNotifications?.list ?? []);
			setTotal(res.data?.getNotifications?.total ?? 0);
		},
	});

	const visibleItems = useMemo(() => items.filter((n) => !hiddenIds.has(n._id)), [items, hiddenIds]);
	const unreadCount = useMemo(
		() => items.filter((n) => n.notificationStatus === NotificationStatus.WAIT && !hiddenIds.has(n._id)).length,
		[items, hiddenIds],
	);
	const canLoadMore = items.length < total;

	/** HANDLERS **/
	const loadMore = async () => {
		if (!canLoadMore || loading || loadingMore) return;
		setLoadingMore(true);
		const nextPage = page + 1;
		try {
			const res = await fetchMore({
				variables: { input: { page: nextPage, limit: PAGE_LIMIT } },
				updateQuery: (prev, { fetchMoreResult }) => fetchMoreResult ?? prev,
			});
			const nextList = res.data?.getNotifications?.list ?? [];
			const nextTotal = res.data?.getNotifications?.total ?? total;
			setItems((prevList) => mergeUniqueSorted(prevList, nextList));
			setTotal(nextTotal);
			setPage(nextPage);
		} finally {
			setLoadingMore(false);
		}
	};

	const onScroll = (e: UIEvent<HTMLDivElement>) => {
		if (!canLoadMore || loading || loadingMore) return;
		const el = e.currentTarget;
		const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
		if (nearBottom) loadMore();
	};

	useEffect(() => {
		const box = listBoxRef.current;
		if (!box || loading || loadingMore || !canLoadMore) return;
		const needMore = box.scrollHeight <= box.clientHeight + 64;
		if (needMore) loadMore();
	}, [hiddenIds, items.length]);

	const handleMarkOne = async (id: string) => {
		setItems((prev) => prev.map((n) => (n._id === id ? { ...n, notificationStatus: NotificationStatus.READ } : n)));
		try {
			await markOne({ variables: { notificationId: id } });
		} catch {
			setItems((prev) => prev.map((n) => (n._id === id ? { ...n, notificationStatus: NotificationStatus.WAIT } : n)));
		}
	};

	const handleMarkAll = async () => {
		await markAll({
			optimisticResponse: { markAllNotificationsRead: true },
		});
		setItems((prev) => prev.map((n) => ({ ...n, notificationStatus: NotificationStatus.READ })));
		const res = await refetch({ input: { page: 1, limit: PAGE_LIMIT } });
		setPage(1);
		setItems(res.data?.getNotifications?.list ?? []);
		setTotal(res.data?.getNotifications?.total ?? 0);
	};

	return (
		<>
			<Badge color="error" badgeContent={unreadCount} max={9} overlap="circular">
				<IconButton
					onClick={(e: any) => setAnchorEl(e.currentTarget)}
					sx={{ borderRadius: '14px', bgcolor: 'transparent', '&:hover': { bgcolor: 'rgba(212,180,131,.12)' } }}
				>
					<NotificationsOutlinedIcon className="notification-icon" />
				</IconButton>
			</Badge>

			<Menu
				open={open}
				onClose={() => setAnchorEl(null)}
				anchorEl={anchorEl}
				PaperProps={{
					elevation: 0,
					sx: {
						width: 420,
						maxWidth: '92vw',
						maxHeight: 520,
						overflow: 'hidden',
						borderRadius: 3,
						border: '1px solid rgba(212,180,131,0.45)',
						boxShadow: '0 14px 36px rgba(24,26,32,0.18)',
						background: '#fffdf8',
						color: '#2e2424',
					},
				}}
			>
				<Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1.25}>
					<Typography sx={{ fontWeight: 800, letterSpacing: 0.3 }}>Notifications</Typography>
					<Button
						size="small"
						startIcon={<DoneAllIcon />}
						onClick={handleMarkAll}
						disabled={!unreadCount || markingAll}
						sx={{
							textTransform: 'none',
							fontWeight: 700,
							borderRadius: 999,
							px: 1.2,
							py: 0.4,
							color: '#2b241c',
							bgcolor: unreadCount ? '#d4b483' : 'rgba(212,180,131,0.4)',
							'&:hover': { bgcolor: '#e1c69d' },
						}}
					>
						Mark all
					</Button>
				</Stack>

				<Divider sx={{ borderColor: 'rgba(212,180,131,0.35)' }} />

				{/* Scroll container */}
				<Box ref={listBoxRef} onScroll={onScroll} sx={{ overflowY: 'auto', maxHeight: 420, py: 0.5 }}>
					{loading && items.length === 0 ? (
						<Stack alignItems="center" py={3}>
							<CircularProgress size={22} />
						</Stack>
					) : (
						<>
							<List dense disablePadding>
								{visibleItems.map((n) => {
									const actor = (n as any).memberData || { _id: n.authorId, memberNick: 'Someone', memberImage: '' };
									const isUnread = n.notificationStatus === NotificationStatus.WAIT;
									const action = actionText(n);
									const secondary = secondaryText(n);

									return (
										<Box
											key={n._id}
											sx={{
												mx: 1,
												my: 0.5,
												borderRadius: 2,
												border: isUnread ? '1px solid rgba(212,180,131,0.55)' : '1px solid rgba(24,26,32,0.06)',
												background: isUnread ? 'rgba(212,180,131,0.10)' : '#fff',
												transition: 'transform .15s ease, background .2s ease, border .2s ease',
												'&:hover': {
													transform: 'translateY(-1px)',
													background: '#fffdfa',
													border: '1px solid rgba(212,180,131,0.65)',
												},
												...(isUnread ? {} : { opacity: 0.78, filter: 'saturate(0.92)' }),
											}}
										>
											<ListItem
												alignItems="flex-start"
												disableGutters
												sx={{ px: 1.25, py: 1, cursor: 'pointer' }}
												onClick={async (e: any) => {
													e.stopPropagation();
													if (isUnread && !markingOne) {
														await handleMarkOne(n._id);
													}
												}}
												secondaryAction={
													<Stack direction="row" alignItems="center" spacing={0.5}>
														{isUnread ? (
															<Tooltip title="Unread">
																<FiberManualRecordRoundedIcon sx={{ fontSize: 12, color: '#d4b483', mr: 0.5 }} />
															</Tooltip>
														) : (
															<Tooltip title="Read">
																<CheckCircleOutlineRoundedIcon sx={{ fontSize: 16, color: '#8a8071', mr: 0.5 }} />
															</Tooltip>
														)}
														<Tooltip title="Remove notification">
															<IconButton
																edge="end"
																onClick={(e: any) => {
																	e.stopPropagation();
																	SOFT_DELETE_ONLY ? handleSoftRemove(n._id) : handleSoftRemove(n._id);
																}}
																sx={{
																	color: '#6b5a45',
																	'&:hover': { color: '#2e2424', bgcolor: 'rgba(212,180,131,0.15)' },
																}}
															>
																<DeleteOutlineRoundedIcon />
															</IconButton>
														</Tooltip>
													</Stack>
												}
											>
												<ListItemAvatar sx={{ mr: 1.25 }}>
													<Avatar
														src={buildImgSrc(actor?.memberImage)}
														alt={actor?.memberNick || 'user'}
														sx={{ width: 40, height: 40, bgcolor: '#fff', border: '2px solid #d4b483' }}
														imgProps={{
															style: { objectFit: 'cover', background: '#fff' },
															onError: (e: any) => {
																e.currentTarget.src = '/img/profile/defaultUser3.svg';
															},
														}}
													/>
												</ListItemAvatar>

												<ListItemText
													primary={
														<Stack direction="row" alignItems="baseline" gap={1} flexWrap="wrap">
															{!isUnread && (
																<CheckCircleOutlineRoundedIcon sx={{ fontSize: 14, mt: '2px', color: '#8a8071' }} />
															)}
															<Typography sx={{ fontWeight: 800, color: '#2e2424' }}>
																{actor?.memberNick ?? 'Someone'}
															</Typography>
															<Typography sx={{ fontWeight: isUnread ? 700 : 500, color: '#3a2e2e' }}>
																{action}
															</Typography>
															<Typography sx={{ ml: 'auto', fontSize: 12, color: '#857a6b' }}>
																{moment(n.createdAt).fromNow()}
															</Typography>
														</Stack>
													}
													secondary={
														secondary ? (
															<Typography
																sx={{
																	color: '#5d5247',
																	display: '-webkit-box',
																	WebkitLineClamp: 2,
																	WebkitBoxOrient: 'vertical',
																	overflow: 'hidden',
																}}
																variant="body2"
															>
																{secondary}
															</Typography>
														) : null
													}
													primaryTypographyProps={{ component: 'div' }}
												/>
											</ListItem>
										</Box>
									);
								})}
							</List>

							{/* Load more area */}
							<Stack alignItems="center" py={canLoadMore ? 1.5 : 0.5}>
								{canLoadMore ? (
									<Button
										onClick={loadMore}
										disabled={loading || loadingMore}
										sx={{
											textTransform: 'none',
											fontWeight: 700,
											borderRadius: 999,
											px: 1.6,
											py: 0.6,
											color: '#2b241c',
											bgcolor: '#e9d6b3',
											'&:hover': { bgcolor: '#e1c69d' },
										}}
									>
										{loadingMore ? 'Loading…' : 'Load more'}
									</Button>
								) : (
									<Typography sx={{ color: '#8a8071', fontSize: 12, py: 0.5 }}>
										{items.length ? 'No more notifications' : 'No notifications'}
									</Typography>
								)}
							</Stack>
						</>
					)}
				</Box>
			</Menu>
		</>
	);
};

export default NotificationBell;
