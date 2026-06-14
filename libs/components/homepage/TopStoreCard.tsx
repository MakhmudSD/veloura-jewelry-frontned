import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { Member } from '../../types/member/member';
import { useReactiveVar } from '@apollo/client';
import { userVar } from '../../../apollo/store';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import { resolveImageUrl } from '../../config';
import { sweetMixinErrorAlert } from '../../sweetAlert';
import { i18n, useTranslation } from 'next-i18next';

interface TopStoreProps {
	store: Member;
	likeMemberHandler: any;
	myFavorites?: boolean;
	recentlyVisited?: boolean;
	user?: any;
}

const TopStoreCard = (props: TopStoreProps) => {
	const { store, likeMemberHandler, myFavorites, recentlyVisited } = props;
	const device = useDeviceDetect();
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const [liked, setLiked] = useState(store?.meLiked?.[0]?.myFavorite || false);
	const [glow, setGlow] = useState(false);
	const { t } = useTranslation('common');

	const storeImage = resolveImageUrl(store?.memberImage, '/img/profile/defaultStore.jpg');

	/** HANDLERS **/
	const pushDetailHandler = async (storeId: string) => {
		router.push({ pathname: '/store/detail', query: { id: storeId } });
	};

	const handleLikeClick = (e: React.MouseEvent, productId: string) => {
		e.preventDefault();
		e.stopPropagation();
		likeMemberHandler(user, productId);
		setLiked((prev) => !prev);
		setGlow(true);
		setTimeout(() => setGlow(false), 600);
	};

	if (device === 'mobile') {
		return (
			<Stack className="top-store-card mobile" onClick={() => pushDetailHandler(store._id)}>
				<Box className="mobile-image-box">
					<img src={storeImage} alt={store.memberNick} />
					<Box className="mobile-like">
						<IconButton
							size="small"
							onClick={(e: any) => handleLikeClick(e, store._id)}
							title={!user?._id ? 'Login required to like' : 'Like this store'}
						>
							{liked || myFavorites || store?.meLiked?.[0]?.myFavorite ? (
								<FavoriteIcon className={glow ? 'glow' : ''} fontSize="small" />
							) : (
								<FavoriteBorderIcon fontSize="small" />
							)}
						</IconButton>
					</Box>
					<Box className="mobile-overlay">
						<strong className="name">{store?.memberNick}</strong>
						<span className="type">{store?.memberType}</span>
					</Box>
				</Box>

				{/* Optional: quick stats row on mobile */}
				{!recentlyVisited && (
					<Box className="mobile-stats">
						<Box className="view-box">
							<RemoveRedEyeIcon fontSize="small" />
							<Typography component="span">{store?.memberViews}</Typography>
						</Box>
						<Box className="count-box">
							<Typography component="span">{store?.memberProducts} Products</Typography>
						</Box>
						<div className="stat-item">
							<span className="icon">
								<img src="/img/icons/followers.png" alt="follower" />
							</span>
							{store.memberFollowers} {t('Followers')}
						</div>
						<div className="stat-item">
							<span className="icon">
								<img src="/img/icons/followers.png" alt="following" />
							</span>
							{store.memberFollowings} {t('Followings')}
						</div>
					</Box>
				)}
			</Stack>
		);
	} else {
		return (
			<Stack className="top-store-card">
				<Stack className="store-image-container">
					<img src={storeImage} alt={store.memberNick} />
				</Stack>

				<Stack className="top-store-card-down">
					<Stack className="top-store-card-info">
						<h1>
							<img src="/img/stores/address.png" alt="address" />
							{t(store.memberAddress ?? 'Seoul')}
						</h1>{' '}
						<strong>{t(store.memberNick)}</strong>
						<p>
							{' '}
							<img src="/img/stores/contact.png" alt="phone" />
							{store.memberPhone}
						</p>
					</Stack>
					<Stack className="top-store-card-middle">
						<span>{t(store?.memberDesc ?? 'No Description')}</span>
					</Stack>

					<Stack className="stats-row">
						<div className="stat-item">
							<span className="icon">
								<img src="/img/icons/followers.png" alt="follower" />
							</span>
							{store.memberFollowers} {t('Followers')}
						</div>
						<div className="stat-item">
							<span className="icon">
								<img src="/img/icons/followers.png" alt="following" />
							</span>
							{store.memberFollowings} {t('Followings')}
						</div>
						<div className="stat-item">
							<span className="icon">
								<img src="/img/icons/product.png" alt="products" />
							</span>
							{store.memberProducts} {t('Products')}
						</div>
					</Stack>

					<button
						className="view-store-btn"
						onClick={(e) => {
							e.stopPropagation();
							router.push(`/store/detail?id=${store._id}`);
						}}
					>
						<span>{t('View Store Info')}</span>
					</button>

					{!recentlyVisited && (
						<div className="interaction-buttons">
							<Box className="view-box">
								<RemoveRedEyeIcon />
								<Typography>{store?.memberViews}</Typography>
							</Box>
							<IconButton
								color="default"
								onClick={async (e: any) => {
									e.stopPropagation();
									if (!user || !user._id) {
										let message = '';
										if (i18n?.language === 'kr') {
										  message = '좋아요를 누르려면 로그인해야 합니다.';
										} else if (i18n?.language === 'uz') {
										  message = 'Tizimga login boling';
										} else {
										  message = 'You must be logged in to like';
										}
									  
										await sweetMixinErrorAlert(message, 2000, () => {
										  router.push('/account/join'); // navigate AFTER alert closes
										});
									  
										return;
									  }
									  
									  await handleLikeClick(e, store._id);
									  
								}}
								title={!user?._id ? t('Login required to like') : t('Like this product')}								
							>
								{liked || myFavorites || store?.meLiked?.[0]?.myFavorite ? (
									<FavoriteIcon color="primary" className={glow ? 'glow' : ''} />
								) : (
									<FavoriteBorderIcon color={!user?._id ? 'disabled' : 'inherit'} />
								)}
							</IconButton>
						</div>
					)}
				</Stack>
			</Stack>
		);
	}
};

export default TopStoreCard;
