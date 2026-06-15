import React, { UIEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
	Avatar,
	Badge,
	Box,
	Button,
	CircularProgress,
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
			return 'listed a new product';
		case NotificationType.ORDER:
			return 'placed a new order with you';
		case NotificationType.MESSAGE:
			return 'sent you a message';
		case NotificationType.NOTICE:
			return 'posted a new announcement';
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
			<Badge
				badgeContent={unreadCount}
				max={9}
				overlap="circular"
				sx={{
					'& .MuiBadge-badge': {
						bgcolor: '#c8872a',
						color: '#fff',
						fontWeight: 700,
						fontSize: 11,
						minWidth: 18,
						height: 18,
					},
				}}
			>
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
						width: 400,
						maxWidth: '94vw',
						maxHeight: 540,
						overflow: 'hidden',
						borderRadius: '14px',
						border: '1px solid rgba(212,180,131,0.5)',
						boxShadow: '0 20px 48px rgba(24,14,4,0.22)',
						background: 'linear-gradient(160deg, #fffcf5 0%, #fdf6e8 100%)',
						color: '#2e2424',
					},
				}}
			>
				{/* Header */}
				<Box
					sx={{
						background: 'linear-gradient(90deg, #c8872a 0%, #d4af37 60%, #b07a20 100%)',
						px: 2,
						py: 1.1,
					}}
				>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Typography
							sx={{
								fontFamily: '"Judson", serif',
								fontWeight: 700,
								fontSize: 17,
								letterSpacing: 0.8,
								color: '#fff',
								textTransform: 'capitalize',
							}}
						>
							Notifications
							{unreadCount > 0 && (
								<Box
									component="span"
									sx={{
										ml: 1,
										px: 0.9,
										py: 0.1,
										borderRadius: 999,
										bgcolor: 'rgba(255,255,255,0.22)',
										fontSize: 12,
										fontWeight: 800,
										verticalAlign: 'middle',
									}}
								>
									{unreadCount} new
								</Box>
							)}
						</Typography>
						<Button
							size="small"
							startIcon={<DoneAllIcon sx={{ fontSize: 15 }} />}
							onClick={handleMarkAll}
							disabled={!unreadCount || markingAll}
							sx={{
								textTransform: 'none',
								fontWeight: 700,
								borderRadius: 999,
								px: 1.4,
								py: 0.35,
								fontSize: 12,
								color: unreadCount ? '#fff' : 'rgba(255,255,255,0.55)',
								bgcolor: 'rgba(255,255,255,0.18)',
								border: '1px solid rgba(255,255,255,0.3)',
								'&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
							}}
						>
							Mark all read
						</Button>
					</Stack>
				</Box>

				{/* Scroll container */}
				<Box ref={listBoxRef} onScroll={onScroll} sx={{ overflowY: 'auto', maxHeight: 460, py: 0.75 }}>
					{loading && items.length === 0 ? (
						<Stack alignItems="center" py={4}>
							<CircularProgress size={22} sx={{ color: '#d4af37' }} />
						</Stack>
					) : (
						<>
							<List dense disablePadding>
								{visibleItems.map((n) => {
									const fallbackNick =
										n.notificationType === NotificationType.ORDER ? 'New Customer'
										: n.notificationType === NotificationType.NOTICE ? 'Veloura Team'
										: 'A user';
									const actor = (n as any).memberData || { _id: n.authorId, memberNick: fallbackNick, memberImage: '' };
									const isUnread = n.notificationStatus === NotificationStatus.WAIT;
									const action = actionText(n);
									const secondary = secondaryText(n);

									return (
										<Box
											key={n._id}
											sx={{
												mx: 1,
												my: 0.5,
												borderRadius: '10px',
												border: isUnread
													? '1px solid rgba(212,175,55,0.45)'
													: '1px solid rgba(24,26,32,0.07)',
												background: isUnread
													? 'linear-gradient(135deg, rgba(212,175,55,0.09) 0%, rgba(255,250,235,0.95) 100%)'
													: 'rgba(255,255,255,0.7)',
												transition: 'transform .15s ease, box-shadow .2s ease',
												'&:hover': {
													transform: 'translateY(-1px)',
													boxShadow: '0 4px 14px rgba(200,135,42,0.14)',
													border: '1px solid rgba(212,175,55,0.6)',
												},
											}}
										>
											<ListItem
												alignItems="flex-start"
												disableGutters
												sx={{ px: 1.25, py: 0.9, cursor: 'pointer' }}
												onClick={async (e: any) => {
													e.stopPropagation();
													if (isUnread && !markingOne) {
														await handleMarkOne(n._id);
													}
												}}
												secondaryAction={
													<Stack direction="row" alignItems="center" spacing={0.5}>
														{isUnread && (
															<Box
																sx={{
																	width: 8,
																	height: 8,
																	borderRadius: '50%',
																	bgcolor: '#c8872a',
																	mr: 0.5,
																	flexShrink: 0,
																}}
															/>
														)}
														<Tooltip title="Dismiss">
															<IconButton
																edge="end"
																size="small"
																onClick={(e: any) => {
																	e.stopPropagation();
																	handleSoftRemove(n._id);
																}}
																sx={{
																	color: '#a08060',
																	'&:hover': { color: '#7a3f10', bgcolor: 'rgba(212,180,131,0.15)' },
																}}
															>
																<DeleteOutlineRoundedIcon fontSize="small" />
															</IconButton>
														</Tooltip>
													</Stack>
												}
											>
												<ListItemAvatar sx={{ mr: 1.25, minWidth: 48 }}>
													<Avatar
														src={buildImgSrc(actor?.memberImage)}
														alt={actor?.memberNick || 'user'}
														sx={{
															width: 42,
															height: 42,
															bgcolor: '#f5e8d0',
															border: isUnread ? '2px solid #c8872a' : '2px solid rgba(212,180,131,0.5)',
															boxShadow: isUnread ? '0 0 0 2px rgba(200,135,42,0.18)' : 'none',
														}}
														imgProps={{
															style: { objectFit: 'cover' },
															onError: (e: any) => {
																e.currentTarget.src = '/img/profile/defaultUser3.svg';
															},
														}}
													/>
												</ListItemAvatar>

												<ListItemText
													primary={
														<Stack direction="row" alignItems="baseline" gap={0.75} flexWrap="wrap" pr={3}>
															<Typography
																sx={{
																	fontWeight: 800,
																	color: '#1a1008',
																	fontFamily: '"Judson", serif',
																	fontSize: 14,
																}}
															>
																{actor?.memberNick}
															</Typography>
															<Typography
																sx={{
																	fontWeight: isUnread ? 600 : 400,
																	color: isUnread ? '#3a2010' : '#6b5a45',
																	fontSize: 13,
																}}
															>
																{action}
															</Typography>
														</Stack>
													}
													secondary={
														<Stack mt={0.3} spacing={0.3}>
															{secondary && (
																<Typography
																	sx={{
																		color: '#7a6248',
																		fontSize: 12,
																		fontStyle: 'italic',
																		display: '-webkit-box',
																		WebkitLineClamp: 2,
																		WebkitBoxOrient: 'vertical',
																		overflow: 'hidden',
																	}}
																	variant="body2"
																>
																	{secondary}
																</Typography>
															)}
															<Typography sx={{ fontSize: 11, color: '#a89070', fontWeight: 500 }}>
																{moment(n.createdAt).fromNow()}
															</Typography>
														</Stack>
													}
													primaryTypographyProps={{ component: 'div' }}
													secondaryTypographyProps={{ component: 'div' }}
												/>
											</ListItem>
										</Box>
									);
								})}
							</List>

							{/* Load more / empty state */}
							<Stack alignItems="center" py={canLoadMore ? 1.5 : 1}>
								{canLoadMore ? (
									<Button
										onClick={loadMore}
										disabled={loading || loadingMore}
										sx={{
											textTransform: 'none',
											fontWeight: 700,
											borderRadius: 999,
											px: 2,
											py: 0.5,
											fontSize: 12,
											color: '#2b1c08',
											bgcolor: 'rgba(212,175,55,0.18)',
											border: '1px solid rgba(212,175,55,0.4)',
											'&:hover': { bgcolor: 'rgba(212,175,55,0.3)' },
										}}
									>
										{loadingMore ? 'Loading…' : 'Load more'}
									</Button>
								) : (
									<Typography sx={{ color: '#a89070', fontSize: 12, fontStyle: 'italic' }}>
										{items.length ? 'You\'re all caught up' : 'No notifications yet'}
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
