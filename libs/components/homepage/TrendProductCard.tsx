import React, { useState } from 'react';
import { Stack, Box, Typography, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import { resolveImageUrl } from '../../config';
import { useReactiveVar } from '@apollo/client';
import { basketItemsVar, userVar } from '../../../apollo/store';
import { Product } from '../../types/product/product';
import router from 'next/router';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { sweetMixinErrorAlert } from '../../sweetAlert';
import { i18n, useTranslation } from 'next-i18next';

interface TrendProductCardProps {
	product: Product;
	likeProductHandler: (user: any, id: string) => Promise<void> | void;
	myFavorites?: boolean;
	recentlyVisited?: boolean;
	user?: any;
}

const TrendProductCard = (props: TrendProductCardProps) => {
	const { product, likeProductHandler, myFavorites, recentlyVisited } = props;

	const reactiveUser = useReactiveVar(userVar);
	const { t } = useTranslation('common');

	const user = props.user ?? reactiveUser;

	const device = useDeviceDetect();
	const isMobile = device === 'mobile';

	const [liked, setLiked] = useState<boolean>(Boolean(product?.meLiked?.[0]?.myFavorite));
	const [glow, setGlow] = useState(false);

	const imagePath: string = resolveImageUrl(product?.productImages?.[0], '/img/banner/header1.svg');

	const pushDetailHandler = (productId: string) => {
		router.push({ pathname: '/product/detail', query: { id: productId } });
	};

	const handleAdd = (id: string, title: string, image: string, price: number) => {
		const current = basketItemsVar();
		const idx = current.findIndex((item) => item.productId === id);
		const next = [...current];

		if (idx > -1) {
			next[idx].itemQuantity += 1;
		} else {
			next.push({
				id,
				_id: id,
				productId: id,
				productTitle: title,
				productImages: image,
				productPrice: price,
				itemQuantity: 1,
				ringSize: null,
				weight: null,
			});
		}
		basketItemsVar(next);
	};

	const handleLikeClick = (e: React.MouseEvent, productId: string) => {
		e.preventDefault();
		e.stopPropagation();
		likeProductHandler(user, productId);
		setLiked((prev) => !prev);
		setGlow(true);
		setTimeout(() => setGlow(false), 600);
	};

	const handleAddClick = async (e: React.MouseEvent) => {
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
		handleAdd(product._id, product.productTitle, imagePath, product.productPrice);
	};

	return (
		<Stack className={`carousel${isMobile ? ' mobile' : ''}`} data-device={isMobile ? 'mobile' : 'desktop'}>
			<Stack className="card-wrapper">
				<Stack
					className={`trend-card-box${isMobile ? ' mobile' : ''}`}
					key={product._id}
					data-device={isMobile ? 'mobile' : 'desktop'}
				>
					<Box
						className="card-img"
						onClick={() => pushDetailHandler(product._id)}
						role="button"
						tabIndex={0}
						aria-label={`Open ${product.productTitle} details`}
						onKeyDown={(e: React.KeyboardEvent) => {
							if (e.key === 'Enter' || e.key === ' ') pushDetailHandler(product._id);
						}}
					>
						<img className="main-img" src={imagePath} alt={product.productTitle} loading="lazy" />
						{product?.productImages?.[1] && (
							<img
								className="hover-img"
								src={resolveImageUrl(product.productImages[1])}
								alt={`${product.productTitle} alternate`}
								loading="lazy"
							/>
						)}

						{product?.productCategory && (
							<Box className="badge">
								<Typography className="badge-text">{t(product.productCategory)}</Typography>
							</Box>
						)}

						{!recentlyVisited && (
							<div className={`btn-group${isMobile ? ' mobile-open' : ''}`}>
								<Box className="view-box" aria-label="view count">
									<RemoveRedEyeIcon sx={{ fontSize: isMobile ? 13 : 14 }} />
									<Typography>{product?.productViews}</Typography>
								</Box>

								<button className="add-to-basket-btn" type="button" onClick={handleAddClick} aria-label="Add to cart">
									<span>{t('Add to Cart')}</span>
								</button>

								<IconButton
									color="default"
									className="like-btn"
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
										handleLikeClick(e, product._id);
									}}
									title={!user?._id ? t('Login required to like') : t('Like this product')}
									aria-label={liked || myFavorites || product?.meLiked?.[0]?.myFavorite ? t('Unlike this product') : t('Like this product')}
									aria-pressed={Boolean(liked || myFavorites || product?.meLiked?.[0]?.myFavorite)}
									size={isMobile ? 'small' : 'medium'}
								>
									{liked || myFavorites || product?.meLiked?.[0]?.myFavorite ? (
										<FavoriteIcon
											color="primary"
											className={glow ? 'glow' : ''}
											fontSize={isMobile ? 'small' : 'medium'}
										/>
									) : (
										<FavoriteBorderIcon
											color={!user?._id ? 'disabled' : 'inherit'}
											fontSize={isMobile ? 'small' : 'medium'}
										/>
									)}
								</IconButton>
							</div>
						)}
					</Box>
				</Stack>

				<Stack className={`info-bottom${isMobile ? ' mobile' : ''}`} data-device={isMobile ? 'mobile' : 'desktop'}>
					<Box className="info">
						<strong
							className="title"
							onClick={() => pushDetailHandler(product._id)}
							role="button"
							tabIndex={0}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') pushDetailHandler(product._id);
							}}
						>
							{product.productTitle}
						</strong>

						<Box className="meta">
							<Typography className="price">From ₩ {product.productPrice}</Typography>
						</Box>
					</Box>
				</Stack>
			</Stack>
		</Stack>
	);
};

export default TrendProductCard;
