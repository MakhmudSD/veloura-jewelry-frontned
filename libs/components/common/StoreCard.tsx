import React, { useState } from 'react';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { Stack, Box, Typography } from '@mui/material';
import Link from 'next/link';
import { resolveImageUrl } from '../../config';
import IconButton from '@mui/material/IconButton';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useReactiveVar } from '@apollo/client';
import { userVar } from '../../../apollo/store';
import { useRouter } from 'next/router';
import { sweetMixinErrorAlert } from '../../sweetAlert';
import { i18n, useTranslation } from 'next-i18next';

interface StoreCardProps {
	store: any;
	likeMemberHandler: any;
	myFavorites?: boolean;
	recentlyVisited?: boolean;
	user?: any;
}

const StoreCard = (props: StoreCardProps) => {
	const { store, likeMemberHandler, myFavorites, recentlyVisited } = props;
	const device = useDeviceDetect();
	const router = useRouter();
	const user = useReactiveVar(userVar);
	const { t } = useTranslation('common');
	const [liked, setLiked] = useState(store?.meLiked?.[0]?.myFavorite || false);
	const [glow, setGlow] = useState(false);
	const [tilt, setTilt] = useState({ x: 0, y: 0 });
	const cardRef = React.useRef<HTMLDivElement>(null);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!cardRef.current) return;
		const rect = cardRef.current.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
		const y = -((e.clientY - rect.top) / rect.height - 0.5) * 16;
		setTilt({ x, y });
	};
	const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

	const imagePath: string = store?.memberImage
		? resolveImageUrl(store.memberImage)
		: '/img/profile/defaultStore.jpg';

	const handleLikeClick = (e: React.MouseEvent, productId: string) => {
		e.preventDefault();
		e.stopPropagation();
		likeMemberHandler(user, productId);
		setLiked((prev: any) => !prev);
		setGlow(true);
		setTimeout(() => setGlow(false), 600);
	};

	if (device === 'mobile') {
		return <div>STORE CARD</div>;
	} else {
		return (
			<Stack
				className="top-store-card"
				ref={cardRef}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				style={{
					transform: `perspective(800px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(${tilt.x !== 0 || tilt.y !== 0 ? 1.02 : 1})`,
					transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s ease' : 'transform 0.1s ease',
				}}
			>
				<Stack className="store-image-container">
					<img src={imagePath} alt={store.memberNick} />
					{store.memberAddress && (
						<Box className="location-badge">
							<span>📍 {store.memberAddress.split(' ').slice(0, 2).join(' ')}</span>
						</Box>
					)}
				</Stack>

				<Stack className="top-store-card-down">
					<Stack className="top-store-card-info">
						<h1>
							<img src="/img/stores/address.png" alt="phone" />
							{store.memberAddress ?? 'Seoul'}
						</h1>
						<strong>{store.memberNick}</strong>
						<p>
							<img src="/img/stores/contact.png" alt="phone" />
							{store.memberPhone}
						</p>
					</Stack>

					<Stack className="top-store-card-middle">
						<span>{store?.memberDesc ?? 'No Description'}</span>
					</Stack>

					<Stack className="stats-row">
						<div className="stat-item">
							<span className="icon">
								<img src="/img/icons/followers.png" alt="follower" />
							</span>
							<span>{store.memberFollowers} Followers</span>
						</div>
						<div className="stat-item">
							<span className="icon">
								<img src="/img/icons/followers.png" alt="following" />
							</span>
							<span>{store.memberFollowings} Followings</span>
						</div>
						<div className="stat-item">
							<span className="icon">
								<img src="/img/icons/product.png" alt="products" />
							</span>
							<span>{store.memberProducts} Products</span>
						</div>
					</Stack>

					<button
						className="view-store-btn"
						onClick={(e) => {
							e.stopPropagation();
							router.push(`/store/detail?id=${store._id}`);
						}}
					>
						<span>View Store Info</span>
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
									handleLikeClick(e, store._id);
								}}
								title={!user?._id ? 'Login required to like' : 'Like this product'}
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

export default StoreCard;
