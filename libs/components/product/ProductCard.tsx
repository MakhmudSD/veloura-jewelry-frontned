import React, { useEffect, useState } from 'react';
import { Box, IconButton, Rating, Typography } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client';
import Link from 'next/link';
import { Product } from '../../types/product/product';
import { resolveImageUrl, topProductRank } from '../../config';
import { formatterStr } from '../../utils';
import { basketItemsVar, userVar } from '../../../apollo/store';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { sweetBasicAlert, sweetMixinErrorAlert } from '../../sweetAlert';
import { i18n, useTranslation } from 'next-i18next';
interface ProductCardType {
	product: Product;
	likeProductHandler?: any;
	myFavorites?: boolean;
	recentlyVisited?: boolean;
	user?: any;
}

const ProductCard = ({
	product,
	likeProductHandler,
	myFavorites,
	recentlyVisited,
	user = useReactiveVar(userVar),
}: ProductCardType) => {
	const device = useDeviceDetect();
	const router = useRouter();
	const { t } = useTranslation('common');

	const [liked, setLiked] = useState(product?.meLiked?.[0]?.myFavorite || false);
	const [glow, setGlow] = useState(false);
	const [stars, setStars] = useState<number>(0);

	const image1 = resolveImageUrl(product?.productImages?.[0], '/img/banner/header1.svg');
	const image2 = resolveImageUrl(product?.productImages?.[1]) || image1;

	useEffect(() => {
		if (product) {
			const commentCount = product?.productComments || 0;
			const likeCount = product?.productLikes || 0;
			const viewCount = product?.productViews || 0;
			const calculatedStars = Math.min(5, (commentCount + likeCount + viewCount) / 3);
			setStars(calculatedStars);
		}
	}, [product]);

	const handleLikeClick = (productId: string) => {
		likeProductHandler(user, productId);
		setLiked((prev) => !prev);
		setGlow(true);
		setTimeout(() => setGlow(false), 600);
	};

	const handleAdd = (id: string, title: string, image: string, price: number) => {
		const currentItems = basketItemsVar();
		const index = currentItems.findIndex((item) => item.productId === id);
		let updatedItems = [...currentItems];

		if (index > -1) {
			updatedItems[index].itemQuantity += 1;
		} else {
			updatedItems.push({
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

		basketItemsVar(updatedItems);
	};

	const pushDetailHandler = async (productId: string) => {
		router.push({ pathname: '/product/detail', query: { id: productId } });
	};

	const handleAddClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!user?._id) {
			sweetBasicAlert('You need to be logged in to add items to your cart!');
			return;
		}
		handleAdd(product._id, product.productTitle, image1, product.productPrice);
	};

	const badgeList = [];
	if (product.productRank > topProductRank) badgeList.push({ label: 'TOP', color: 'black' });
	if (Date.now() - new Date(product.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000)
		badgeList.push({ label: 'NEW', color: 'brown' });
	if (product.productViews > 5) badgeList.push({ label: 'HOT', color: 'black' });
	if (product.productLikes > 3) badgeList.push({ label: 'BEST', color: 'brown' });

	const displayedBadges = badgeList.slice(0, 2);

	if (device === 'mobile') return <div>Product CARD</div>;

	return (
		<div className={`card-config v-card-lift ${recentlyVisited ? 'recently-visited' : ''}`}>
			{/* IMAGE */}
			<Box className="card-img" onClick={() => pushDetailHandler(product._id)}>
				<img className="main-img" src={image1} alt={product.productTitle} />
				{product?.productImages?.[1] && <img className="hover-img" src={image2} alt={product.productTitle} />}
				{product?.productCategory && (
					<Box className="badge">
						<Typography className="badge-text">{product.productCategory}</Typography>
					</Box>
				)}

				{/* Glassmorphism hover overlay — price + CTA slides up from bottom */}
				{!recentlyVisited && (
					<div className="glass-overlay" onClick={(e) => e.stopPropagation()}>
						<Typography className="glass-price">₩{formatterStr(product.productPrice)}</Typography>
						<button className="glass-cta" onClick={handleAddClick}>
							Add to Cart
						</button>
					</div>
				)}

				{!recentlyVisited && (
					<div className="btn-group">
						<Box className="views">
							<span>{product?.productViews}</span>
							<RemoveRedEyeIcon style={{ fontSize: '26px', marginTop: '7px' }} />
						</Box>
						<button className="add-to-basket-btn" onClick={handleAddClick}>
							<span>Add to Cart</span>
						</button>
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
								handleLikeClick(product._id);
							}}
							title={!user?._id ? 'Login required to like' : 'Like this product'}
						>
							{liked || myFavorites || product?.meLiked?.[0]?.myFavorite ? (
								<FavoriteIcon color="primary" className={glow ? 'glow' : ''} />
							) : (
								<FavoriteBorderIcon color={!user?._id ? 'disabled' : 'inherit'} />
							)}
						</IconButton>
					</div>
				)}
			</Box>

			{/* INFO */}
			<div className="info-bottom">
				<div className="info">
					<Typography className="price">₩{formatterStr(product.productPrice)}</Typography>
					<Typography className="title">{product.productTitle}</Typography>
					<Box className="product-stars">
						<Rating name="read-only" value={stars} readOnly precision={0.5} size="small" />
					</Box>

					<div className="meta">
						<div className="meta-item">
							<img src="/img/icons/category-icon.png" alt="Category" />
							<span>{product.productCategory}</span>
						</div>
						<div className="meta-item">
							<img src="/img/icons/material-icon.png" alt="Material" />
							<span>{product.productMaterial}</span>
						</div>
						<div className="meta-item">
							<img src="/img/icons/weight-icon.png" alt="Weight" />
							<span>{product.productWeightUnit}</span>
						</div>
					</div>

					<div className="types">
						<span className={product.productLimited ? '' : 'disabled-type'}>Limited Edition</span>
						<span className={product.productBarter ? '' : 'disabled-type'}>Barter</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProductCard;
