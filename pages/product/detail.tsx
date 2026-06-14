import React, { ChangeEvent, useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Divider, IconButton, Rating, Stack, Typography } from '@mui/material';
import useDeviceDetect from '../../libs/hooks/useDeviceDetect';
import withLayoutFull from '../../libs/components/layout/LayoutFull';
import { NextPage } from 'next';
import Review from '../../libs/components/product/Review';
import { Swiper, SwiperSlide } from 'swiper/react';
import SwiperCore, { Autoplay, Navigation, Pagination } from 'swiper';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { useRouter } from 'next/router';
import { Product } from '../../libs/types/product/product';
import moment from 'moment';
import { formatterStr, likeTargetProductHandler } from '../../libs/utils';
import { productWeight, REACT_APP_API_URL, ringSize } from '../../libs/config';
import { basketItemsVar, userVar } from '../../apollo/store';
import { CommentInput, CommentsInquiry } from '../../libs/types/comment/comment.input';
import { Comment } from '../../libs/types/comment/comment';
import { CommentGroup } from '../../libs/enums/comment.enum';
import { Pagination as MuiPagination } from '@mui/material';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import 'swiper/css';
import 'swiper/css/pagination';
import ProductBigCard from '../../libs/components/common/ProductBigCard';
import { GET_COMMENTS, GET_PRODUCT, GET_PRODUCTS } from '../../apollo/user/query';
import { Direction, Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import {
	CREATE_COMMENT,
	CREATE_NOTIFICATION,
	LIKE_TARGET_PRODUCT,
	REMOVE_COMMENT,
	UPDATE_COMMENT,
} from '../../apollo/user/mutation';
import { sweetErrorHandling, sweetMixinErrorAlert } from '../../libs/sweetAlert';
import { ProductsInquiry } from '../../libs/types/product/product.input';
import { ProductCategory } from '../../libs/enums/product.enum';
import { NotificationGroup, NotificationType } from '../../libs/enums/notification.enum';
import { CreateNotificationInput } from '../../libs/types/notification/notification';
import { i18n, useTranslation } from 'next-i18next';
SwiperCore.use([Autoplay, Navigation, Pagination]);

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const ProductDetail: NextPage = ({ initialComment, initialInput, ...props }: any) => {
	const device = useDeviceDetect();
	const router = useRouter();
	const { t } = useTranslation('common');
	const user = useReactiveVar(userVar);
	const [productId, setproductId] = useState<string | null>(null);
	const [product, setProduct] = useState<Product | null>(null);
	const [slideImage, setSlideImage] = useState<string>('');
	const [destinationProducts, setDestinationProducts] = useState<Product[]>([]);
	const [commentInquiry, setCommentInquiry] = useState<CommentsInquiry>(initialComment);
	const [productComments, setProductComments] = useState<Comment[]>([]);
	const [commentTotal, setCommentTotal] = useState<number>(0);
	const [liked, setLiked] = useState(product?.meLiked?.[0]?.myFavorite || false);
	const [glow, setGlow] = useState(false);
	const [stars, setStars] = useState(0);
	const [selectedRingSize, setSelectedRingSize] = useState<number>(ringSize[0]);
	const [quantity, setQuantity] = useState(1);
	const [openAccordion, setOpenAccordion] = useState<string | null>(null);

	const toggleAccordion = (key: string) => setOpenAccordion((prev) => (prev === key ? null : key));

	const [insertCommentData, setInsertCommentData] = useState<CommentInput>({
		commentGroup: CommentGroup.PRODUCT,
		commentContent: '',
		commentRefId: '',
	});

	/** APOLLO REQUESTS **/
	const [likeTargetProduct] = useMutation(LIKE_TARGET_PRODUCT);
	const [createComment] = useMutation(CREATE_COMMENT);
	const [updateComment] = useMutation(UPDATE_COMMENT);
	const [removeComment] = useMutation(REMOVE_COMMENT);
	const [createNotification] = useMutation(CREATE_NOTIFICATION);

	const [searchFilter, setSearchFilter] = useState<ProductsInquiry>(
		router?.query?.input ? JSON.parse(router?.query?.input as string) : initialInput,
	);

	const {
		loading: getProductLoading,
		data: getProductData,
		error: getProductError,
		refetch: getProductRefetch,
	} = useQuery(GET_PRODUCT, {
		fetchPolicy: 'network-only',
		variables: { input: productId },
		skip: !productId,
		notifyOnNetworkStatusChange: true,
		onCompleted: (data: T) => {
			if (data?.getProduct) setProduct(data?.getProduct);
			if (data?.getProduct) setSlideImage(data?.getProduct?.propertyImages[0]);
		},
	});

	const {
		loading: getProductsLoading,
		data: getProductsData,
		error: getProductsError,
		refetch: getProductsRefetch,
	} = useQuery(GET_PRODUCTS, {
		fetchPolicy: 'cache-and-network',
		variables: {
			input: {
				page: 1,
				limit: 4,
				sort: 'createdAt',
				direction: Direction.DESC,
				search: {
					locationList: product?.productLocation ? [product?.productLocation] : [],
				},
			},
		},
		skip: !productId && !product,
		notifyOnNetworkStatusChange: true,
		onCompleted: (data: T) => {
			if (data?.getProducts?.list) setDestinationProducts(data?.getProducts?.list);
		},
	});

	const {
		loading: getCommentsLoading,
		data: getCommentsData,
		error: getCommentsError,
		refetch: getCommentsRefetch,
	} = useQuery(GET_COMMENTS, {
		fetchPolicy: 'cache-and-network',
		variables: { input: initialComment },
		skip: !commentInquiry.search.commentRefId,
		notifyOnNetworkStatusChange: true,
		onCompleted: (data: T) => {
			if (data?.getComments?.list) setProductComments(data?.getComments?.list);
			setCommentTotal(data?.getComments?.metaCounter[0]?.total ?? 0);
		},
	});

	/** LIFECYCLES **/
	useEffect(() => {
		if (router.query.id) {
			setproductId(router.query.id as string);
			setCommentInquiry({
				...commentInquiry,
				search: {
					commentRefId: router.query.id as string,
				},
			});
			setInsertCommentData({
				...insertCommentData,
				commentRefId: router.query.id as string,
			});
		}
	}, [router]);

	useEffect(() => {
		if (commentInquiry.search.commentRefId) {
			getCommentsRefetch({
				input: commentInquiry,
			});
		}
	}, [commentInquiry]);

	useEffect(() => {
		if (product?.productImages?.length && !slideImage) {
			if (product?.productImages?.length) {
				setSlideImage(product.productImages[0]);
			}
		}
	}, [product, slideImage]);

	useEffect(() => {
		if (product) {
			const commentCount = product?.productComments || 0;
			const likeCount = product?.productLikes || 0;
			const viewCount = product?.productViews || 0;

			const calculatedStars = Math.min(5, (commentCount + likeCount + viewCount) / 3);
			setStars(calculatedStars);
		}
	}, [product]);

	/** HANDLERS **/
	const changeImageHandler = (image: string) => {
		setSlideImage(image);
	};

	const commentPaginationChangeHandler = async (event: ChangeEvent<unknown>, value: number) => {
		commentInquiry.page = value;
		setCommentInquiry({ ...commentInquiry });
	};

	const handleLikeClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (productId) {
			if (productId) {
				likeProductHandler(user, productId);
			}
		}
		setLiked((prev) => !prev);
		setGlow(true);
		setTimeout(() => setGlow(false), 600);
	};

	const notifyMember = async (input: CreateNotificationInput) => {
		try {
			await createNotification({ variables: { input } });
		} catch (e) {
			console.warn('notifyMember failed', e);
		}
	};

	const likeProductHandler = async (user: T, id: string) => {
		try {
			const user = userVar();
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

			if (!id) return;
			await likeTargetProduct({ variables: { input: id } }); // Server update
			await getProductsRefetch({ input: searchFilter });
			if (!user._id) {
				void notifyMember({
					notificationType: NotificationType.LIKE,
					notificationGroup: NotificationGroup.PRODUCT,
					notificationTitle: 'New like',
					notificationDesc: `${user.memberNick ?? 'Someone'} liked your product.`,
					authorId: user._id,
				});
			}
		} catch (err: any) {
			console.error('ERROR on likeProductHandler', err.message);
		}
	};

	const isRingCategory =
		product?.productCategory === ProductCategory.RING || product?.productCategory === ProductCategory.WEDDING_RING;

	const selectedWeight = isRingCategory ? productWeight[ringSize.indexOf(selectedRingSize)] : undefined;

	const selectedSize = isRingCategory ? selectedRingSize : null;

	const createCommentHandler = async () => {
		try {
			if (!user._id) throw new Error(Message.NOT_AUTHENTICATED);
			await createComment({ variables: { input: insertCommentData } });
			setInsertCommentData({ ...insertCommentData, commentContent: '' });
			await getCommentsRefetch({ input: commentInquiry });
			void notifyMember({
				notificationType: NotificationType.COMMENT,
				notificationGroup: NotificationGroup.COMMENT,
				notificationTitle: 'New comment',
				notificationDesc: `${user.memberNick ?? 'Someone'} commented on your product.`,
				authorId: user._id,
			});
		} catch (err: any) {
			await sweetErrorHandling(err);
		}
	};

	const toFullImageUrl = (img: string) => (img?.startsWith('http') ? img : `${REACT_APP_API_URL}/${img}`);

	const handleAdd = (
		id: string,
		title: string,
		image: string,
		price: number,
		chosenRingSize?: number | null,
		chosenWeight?: number | null,
		chosenQty: number = 1,
	) => {
		const currentItems = basketItemsVar();
		const index = currentItems.findIndex((item) => item.productId === id);
		const updatedItems = [...currentItems];

		if (index > -1) {
			updatedItems[index].itemQuantity = Math.max(1, (updatedItems[index].itemQuantity || 0) + (chosenQty || 1));
			if (typeof chosenRingSize !== 'undefined')
				updatedItems[index].ringSize = chosenRingSize !== null ? String(chosenRingSize) : null;
			if (typeof chosenWeight !== 'undefined')
				updatedItems[index].weight = chosenWeight !== null ? String(chosenWeight) : null;

			if (updatedItems[index].productImages && !String(updatedItems[index].productImages).startsWith('http')) {
				updatedItems[index].productImages = toFullImageUrl(updatedItems[index].productImages);
			}
		} else {
			updatedItems.push({
				id,
				_id: id,
				productId: id,
				productTitle: title,
				productImages: toFullImageUrl(image),
				productPrice: price,
				itemQuantity: chosenQty || 1,
				ringSize:
					typeof chosenRingSize !== 'undefined' ? (chosenRingSize !== null ? String(chosenRingSize) : null) : null,
				weight: typeof chosenWeight !== 'undefined' ? (chosenWeight !== null ? String(chosenWeight) : null) : null,
				memberNick: product?.memberData?.memberNick || '', 
				memberId: product?.memberData?._id || null,
			});
		}

		basketItemsVar(updatedItems);
	};

	/** HANDLERS **/
	const pushDetailHandler = async (storeId: string) => {
		router.push({ pathname: '/store/detail', query: { id: storeId } });
	};

	const handleAddClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		likeProductHandler(user, productId || '');
		setLiked((prev) => !prev);
		setGlow(true);
		setTimeout(() => setGlow(false), 600);

		if (product) {
			handleAdd(
				product._id,
				product.productTitle,
				slideImage,
				product.productPrice,
				isRingCategory ? selectedRingSize ?? null : null,
				isRingCategory ? selectedWeight ?? null : null, 
				quantity,
			);
		}
	};

	if (getProductLoading) {
		return (
			<Stack sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '1000px' }}>
				<CircularProgress size={'4rem'} />
			</Stack>
		);
	}

	if (device === 'mobile') {
		return <div>PRODUCT DETAIL PAGE</div>;
	} else {
		return (
			<div id={'product-detail-page'}>
				<div className={'container'}>
					<Stack className="detail-top">
						<Stack className={'detail-img'}>
							<Stack className={'sub-images vertical'}>
								{product?.productImages.map((subImg: string, idx: number) => {
									const imagePath: string = `${REACT_APP_API_URL}/${subImg}`;
									return (
										<Stack
											className={`sub-img-box ${slideImage === subImg ? 'active' : ''}`}
											onClick={() => changeImageHandler(subImg)}
											key={subImg}
										>
											<img src={imagePath} alt={`sub-image-${idx}`} />
										</Stack>
									);
								})}
							</Stack>

							{/* Main image on the right */}
							<Stack className={'main-image'}>
								<img
									src={slideImage ? `${REACT_APP_API_URL}/${slideImage}` : '/img/product/bigImage.png'}
									alt={'main-image'}
								/>
							</Stack>
						</Stack>

						<Stack className={'detail-content'}>
							<Box className="detail-title">
								<span>{product?.productTitle}</span>
							</Box>
							<Box className="detail-review">
								{/* Stars */}
								<Rating name="read-only" value={stars} readOnly precision={0.5} size="small" />
								{/* Review Count */}
								<h4>{product?.productComments || 0} reviews</h4>
							</Box>

							<Box className="detail-price">
								<span>KRW{formatterStr(product?.productPrice)}</span>
							</Box>
							<Box className="detail-location">
								<span>{product?.productLocation}</span>
							</Box>
							<Box className="detail-description">
								<span>{product?.productDesc}</span>
							</Box>

							{isRingCategory && (
								<Box className="size-section">
									<label className="label">Size:</label>
									<select
										className="dropdown"
										value={selectedRingSize}
										onChange={(e) => setSelectedRingSize(Number(e.target.value))}
									>
										{ringSize.map((size) => (
											<option key={size} value={size}>
												{size}
											</option>
										))}
									</select>
								</Box>
							)}

							<Box className="detail-weight">
								<span>Weight: {product?.productWeightUnit || 'N/A'}</span>
							</Box>

							<Box className="detail-other-info">
								<div className="info-item">
									<img src="/img/icons/material-detail.png" alt="" />
									{product?.productMaterial || 'N/A'}
								</div>
								<div className="info-item">
									<img src="/img/icons/origin.png" alt="" />
									<strong>Origin:</strong>
									{product?.productOrigin || 'N/A'}{' '}
								</div>
								<div className="info-item">
									<img src="/img/icons/gender.png" alt="" />
									{product?.productGender || 'N/A'}{' '}
								</div>
								<div className="info-item-options">
									<img src="/img/icons/options.png" alt="" />
									<span className={!product?.productLimited ? 'disabled' : ''}>Limited Edition</span>
									<span> / </span>
									<span className={!product?.productBarter ? 'disabled' : ''}>Barter</span>
								</div>
							</Box>

							<Box className="detail-testimonial">
								<span>
									Hurry Up! Only <strong>{product?.productStock || 20} items</strong> left in Stock!
								</span>
							</Box>
							<Divider />
							<Box className="detail-buttons">
								<Box className="calculate">
									<div onClick={() => setQuantity((prev) => Math.min(prev + 1, product?.productStock || 20))}>+</div>
									<span>{quantity}</span>
									<div onClick={() => setQuantity((prev) => Math.max(prev - 1, 0))}>-</div>
								</Box>
								<Button variant="contained" color="success" onClick={handleAddClick}>
									<span>Add to Cart</span>
								</Button>
								<IconButton
									color="default"
									onClick={(e: any) => {
										e.stopPropagation();
										if (!user || !user._id) {
											sweetMixinErrorAlert('You must be logged in to like a product.');
											return;
										}
										if (product && product._id) {
											handleLikeClick(e);
										}
									}}
									title={!user?._id ? 'Login required to like' : 'Like this product'}
								>
									{liked || product?.meLiked?.[0]?.myFavorite ? (
										<FavoriteIcon color="primary" className={glow ? 'glow' : ''} />
									) : (
										<FavoriteBorderIcon color={!user?._id ? 'disabled' : 'inherit'} />
									)}
								</IconButton>
							</Box>

							<Box className="detail-accordion-group">
								{[
									{
										key: 'details',
										label: 'Details',
										content: `Material: ${product?.productMaterial || 'N/A'} · Origin: ${product?.productOrigin || 'N/A'} · Weight: ${product?.productWeightUnit || 'N/A'} · Gender: ${product?.productGender || 'N/A'}`,
									},
									{
										key: 'shipping',
										label: 'Shipping',
										content: 'Estimated delivery: 12–26 days internationally. Express options available at checkout. Free shipping on orders over KRW 150,000.',
									},
									{
										key: 'returns',
										label: 'Returns',
										content: 'Free returns within 30 days of purchase. Items must be unworn and in original packaging. Personalized pieces are non-returnable.',
									},
								].map(({ key, label, content }) => (
									<Box key={key} className="detail-accordion">
										<Box className="accordion-header" onClick={() => toggleAccordion(key)}>
											<span>{label}</span>
											<span className={`chevron ${openAccordion === key ? 'open' : ''}`}>&#8964;</span>
										</Box>
										<Box className={`accordion-body ${openAccordion === key ? 'open' : ''}`}>
											{content}
										</Box>
									</Box>
								))}
							</Box>
							<Box className="detail-meta-info">
								<Typography className="detail-seller">
									<img src="/img/icons/seller.png" alt="Seller Icon" />
									<span className="label">Seller:</span>
									<Link href={{ pathname: '/store/detail', query: { id: product?.memberId } }}>
										{product?.memberData?.memberNick}
									</Link>
								</Typography>

								<Typography className="detail-created-at">
									<img src="/img/icons/calendar.png" alt="Listed On Icon" />
									<span className="label">Listed On:</span>
									{product?.createdAt ? moment(product?.createdAt).format('YYYY-MM-DD') : 'N/A'}
								</Typography>
							</Box>
						</Stack>
					</Stack>

					<Stack className={'address-config'}>
						<Typography className={'title'}>Address</Typography>
						<Stack className={'map-box'}>
							<iframe
								src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25867.098915951767!2d128.68632810247993!3d35.86402299180927!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x35660bba427bf179%3A0x1fc02da732b9072f!2sGeumhogangbyeon-ro%2C%20Dong-gu%2C%20Daegu!5e0!3m2!1suz!2skr!4v1695537640704!5m2!1suz!2skr"
								width="100%"
								height="100%"
								style={{ border: 0 }}
								allowFullScreen={true}
								loading="lazy"
								referrerPolicy="no-referrer-when-downgrade"
							></iframe>
						</Stack>
					</Stack>
					<Stack className={'review-wrapper'}>
						{/* Top review count */}
						<Stack className={'review-cnt'}>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12" fill="none">
								<path
									d="M15.7183 4.60288C15.6171 4.3599 15.3413 4.18787 15.0162 4.16489L10.5822 3.8504L8.82988 0.64527C8.7005 0.409792 8.40612 0.257812 8.07846 0.257812C7.7508 0.257812 7.4563 0.409792 7.32774 0.64527L5.57541 3.8504L1.14072 4.16489C0.815641 4.18832 0.540363 4.36035 0.438643 4.60288C0.337508 4.84586 0.430908 5.11238 0.676772 5.28084L4.02851 7.57692L3.04025 10.9774C2.96794 11.2275 3.09216 11.486 3.35771 11.636C3.50045 11.717 3.66815 11.7575 3.83643 11.7575C3.98105 11.7575 4.12577 11.7274 4.25503 11.667L8.07846 9.88098L11.9012 11.667C12.1816 11.7979 12.5342 11.7859 12.7992 11.636C13.0648 11.486 13.189 11.2275 13.1167 10.9774L12.1284 7.57692L15.4801 5.28084C15.7259 5.11238 15.8194 4.84641 15.7183 4.60288Z"
									fill="#b8860b"
								/>
							</svg>
							<Typography className={'reviews'}>{commentTotal} reviews</Typography>
						</Stack>

						{/* Review list + leave review (side by side) */}
						<Stack className={'review-section'}>
							<Stack className={'review-list'}>
								{/* Show reviews if available */}
								{commentTotal > 0 ? (
									productComments?.map((comment: Comment) => (
										<Review
											key={comment._id}
											comment={comment}
											userId={user?._id}
											onEdit={async (id, content) => {
												await updateComment({
													variables: { input: { _id: id, commentContent: content } },
												});
												await getCommentsRefetch({ input: commentInquiry });
											}}
											onDelete={async (id) => {
												await removeComment({
													variables: { commentId: id },
												});
												await getCommentsRefetch({ input: commentInquiry });
											}}
										/>
									))
								) : (
									/* Show empty message if no reviews */
									<Box className={'empty-review'}>
										<img src="/img/icons/empty.png" alt="No Reviews" />
										<span>Be the first!</span>
										<strong>There are no reviews for this product yet.</strong>
										<p>Your feedback is valuable. Please leave a review to help others know more about this product.</p>
									</Box>
								)}
							</Stack>

							{/* Right side: Leave review form */}
							<Stack className={'leave-review-config'}>
								<Typography className={'main-title'}>Leave A Review</Typography>
								<Typography className={'review-title'}>Review</Typography>
								<textarea
									onChange={({ target: { value } }: any) => {
										setInsertCommentData({ ...insertCommentData, commentContent: value });
									}}
									value={insertCommentData.commentContent}
								></textarea>
								<Box className={'submit-btn'} component={'div'}>
									<Button
										className={'submit-review'}
										disabled={insertCommentData.commentContent === '' || user?._id === ''}
										onClick={createCommentHandler}
									>
										<Typography className={'title'}>Submit Review</Typography>
										<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none">
											<g clipPath="url(#clip0_6975_3642)">
												<path
													d="M16.1571 0.5H6.37936C6.1337 0.5 5.93491 0.698792 5.93491 0.944458C5.93491 1.19012 6.1337 1.38892 6.37936 1.38892H15.0842L0.731781 15.7413C0.558156 15.915 0.558156 16.1962 0.731781 16.3698C0.818573 16.4566 0.932323 16.5 1.04603 16.5C1.15974 16.5 1.27345 16.4566 1.36028 16.3698L15.7127 2.01737V10.7222C15.7127 10.9679 15.9115 11.1667 16.1572 11.1667C16.4028 11.1667 16.6016 10.9679 16.6016 10.7222V0.944458C16.6016 0.698792 16.4028 0.5 16.1571 0.5Z"
													fill="#181A20"
												/>
											</g>
										</svg>
									</Button>
								</Box>
							</Stack>
						</Stack>

						{/* Pagination only when there are reviews */}
						{commentTotal > 0 && (
							<Box component={'div'} className={'pagination-box'}>
								<MuiPagination
									page={commentInquiry.page}
									count={Math.ceil(commentTotal / commentInquiry.limit)}
									onChange={commentPaginationChangeHandler}
									shape="rounded"
									siblingCount={1}
									boundaryCount={1}
								/>
							</Box>
						)}
					</Stack>

					{destinationProducts.length !== 0 && (
						<Stack className="similar-products-config">
							<Stack className="title-pagination-box">
								<Stack className="title-box">
									<Typography className="main-title">Exquisite Selections</Typography>
									<Typography className="sub-title">
										Curated treasures chosen to complement your refined taste
									</Typography>
								</Stack>
							</Stack>

							<Stack className="cards-box">
								<Swiper
									className="similar-products-config-swiper"
									slidesPerView={2}
									spaceBetween={20}
									centeredSlides={false}
									navigation={{
										nextEl: '.similar-products-config-next',
										prevEl: '.similar-products-config-prev',
									}}
									pagination={{
										el: '.similar-products-config-pagination',
										clickable: true,
									}}
								>
									{destinationProducts.map((product) => (
										<SwiperSlide className="similar-products-config-slide" key={product._id}>
											<ProductBigCard product={product} likeProductHandler={likeProductHandler} />
										</SwiperSlide>
									))}
								</Swiper>
							</Stack>
						</Stack>
					)}
				</div>

				{/* Sticky mobile add-to-cart bar */}
				{product && (
					<Box className="mobile-sticky-cart">
						<Box className="sticky-price">KRW{formatterStr(product.productPrice)}</Box>
						<Button
							variant="contained"
							className="sticky-add-btn"
							onClick={() =>
								handleAdd(
									product._id,
									product.productTitle,
									slideImage,
									product.productPrice,
									isRingCategory ? selectedRingSize ?? null : null,
									isRingCategory ? selectedWeight ?? null : null,
									quantity,
								)
							}
						>
							Add to Cart
						</Button>
					</Box>
				)}
			</div>
		);
	}
};

ProductDetail.defaultProps = {
	initialComment: {
		page: 1,
		limit: 5,
		sort: 'createdAt',
		direction: 'DESC',
		search: {
			commentRefId: '',
		},
	},
};

export default withLayoutFull(ProductDetail);
