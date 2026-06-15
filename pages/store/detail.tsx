import React, { ChangeEvent, useEffect, useState } from 'react';
import { NextPage } from 'next';
import useDeviceDetect from '../../libs/hooks/useDeviceDetect';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import ProductBigCard from '../../libs/components/common/ProductBigCard';
import ReviewCard from '../../libs/components/store/ReviewCard';
import { Box, Button, Pagination, Stack, Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { useRouter } from 'next/router';
import { Product } from '../../libs/types/product/product';
import { Member } from '../../libs/types/member/member';
import { sweetErrorHandling, sweetMixinErrorAlert, sweetTopSmallSuccessAlert } from '../../libs/sweetAlert';
import { userVar } from '../../apollo/store';
import { ProductsInquiry } from '../../libs/types/product/product.input';
import { CommentInput, CommentsInquiry } from '../../libs/types/comment/comment.input';
import { Comment } from '../../libs/types/comment/comment';
import { CommentGroup } from '../../libs/enums/comment.enum';
import { resolveImageUrl } from '../../libs/config';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GET_COMMENTS, GET_MEMBER, GET_PRODUCTS } from '../../apollo/user/query';
import { T } from '../../libs/types/common';
import { CREATE_COMMENT, CREATE_NOTIFICATION, LIKE_TARGET_PRODUCT } from '../../apollo/user/mutation';
import { Message } from '../../libs/enums/common.enum';
import { CreateNotificationInput } from '../../libs/types/notification/notification';
import { NotificationType, NotificationGroup } from '../../libs/enums/notification.enum';
import { i18n, useTranslation } from 'next-i18next';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const StoreDetail: NextPage = ({ initialInput, initialComment, ...props }: any) => {
	const device = useDeviceDetect();
	const router = useRouter();
	const { t } = useTranslation('common');
	const user = useReactiveVar(userVar);
	const [mbId, setMbId] = useState<string | null>(null);
	const [store, setStore] = useState<Member | null>(null);
	const [searchFilter, setSearchFilter] = useState<ProductsInquiry>(initialInput);
	const [storeProducts, setStoreProducts] = useState<Product[]>([]);
	const [productTotal, setProductTotal] = useState<number>(0);
	const [commentInquiry, setCommentInquiry] = useState<CommentsInquiry>(initialComment);
	const [storeComments, setStoreComments] = useState<Comment[]>([]);
	const [commentTotal, setCommentTotal] = useState<number>(0);
	const [insertCommentData, setInsertCommentData] = useState<CommentInput>({
		commentGroup: CommentGroup.MEMBER,
		commentContent: '',
		commentRefId: '',
	});

	const [likeTargetProduct] = useMutation(LIKE_TARGET_PRODUCT);
	const [createComment] = useMutation(CREATE_COMMENT);
	const [createNotification] = useMutation(CREATE_NOTIFICATION);

	/** APOLLO REQUESTS **/
	const {
		loading: getStoreLoading,
		data: getStoreData,
		error: getStoreError,
		refetch: getStoreRefetch,
	} = useQuery(GET_MEMBER, {
		fetchPolicy: 'network-only',
		variables: {
			input: mbId,
		},
		skip: !mbId,
		notifyOnNetworkStatusChange: true,
		onCompleted: (data: T) => {
			setStore(data?.getMember);
			setSearchFilter((prev) => ({
				...prev,
				search: {
					...prev.search,
					memberId: data?.getMember?._id,
				},
			}));
			setCommentInquiry((prev) => ({
				...prev,
				search: {
					...prev.search,
					commentRefId: data?.getMember?._id,
				},
			}));
			setInsertCommentData((prev) => ({
				...prev,
				commentRefId: data?.getMember?._id,
			}));
		},
	});

	const {
		loading: getProductsLoading,
		data: getProductsData,
		error: getProductsError,
		refetch: getProductsRefetch,
	} = useQuery(GET_PRODUCTS, {
		fetchPolicy: 'network-only',
		variables: {
			input: searchFilter,
		},
		skip: !searchFilter.search?.memberId,
		notifyOnNetworkStatusChange: true,
		onCompleted: (data: T) => {
			setStoreProducts(data?.getProducts?.list);
			setProductTotal(data?.getProducts?.metaCounter[0]?.total || 0);
		},
	});

	const {
		loading: getCommentsLoading,
		data: getCommentsData,
		error: getCommentsError,
		refetch: getCommentsRefetch,
	} = useQuery(GET_COMMENTS, {
		fetchPolicy: 'cache-and-network',
		variables: {
			input: commentInquiry,
		},
		skip: !commentInquiry.search?.commentRefId,
		notifyOnNetworkStatusChange: true,
		onCompleted: (data: T) => {
			setStoreComments(data?.getComments?.list);
			setCommentTotal(data?.getComments?.metaCounter[0]?.total || 0);
		},
	});

	/** LIFECYCLES **/

	useEffect(() => {
		if (!router.isReady) return;
		const id = router.query.id;
		if (id && typeof id === 'string') {
			setMbId(id);
		}
	}, [router.isReady, router.query.id]);

	useEffect(() => {
		if (!user || !user._id || !mbId) return;
		getStoreRefetch({ variables: { input: mbId } });
	}, [user, mbId]);

	useEffect(() => {
		if (store?._id) {
			setInsertCommentData((prev) => ({
				...prev,
				commentGroup: CommentGroup.MEMBER,
				commentRefId: store._id,
			}));
		}
	}, [store?._id]);

	useEffect(() => {
		if (searchFilter.search?.memberId) {
			getProductsRefetch({ variables: { input: searchFilter } }).then();
		}
	}, [searchFilter]);

	useEffect(() => {
		if (commentInquiry.search?.commentRefId) {
			getCommentsRefetch({ variables: { input: commentInquiry } }).then();
		}
	}, [commentInquiry]);

	/** HANDLERS **/
	const redirectToMemberPageHandler = async (memberId: string) => {
		try {
			if (memberId === user?._id) await router.push(`/mypage?memberId=${memberId}`);
			else await router.push(`/member?memberId=${memberId}`);
		} catch (error) {
			await sweetErrorHandling(error);
		}
	};

	const productPaginationChangeHandler = async (event: ChangeEvent<unknown>, value: number) => {
		setSearchFilter((prev) => ({
			...prev,
			page: value,
		}));
	};

	const commentPaginationChangeHandler = async (event: ChangeEvent<unknown>, value: number) => {
		setCommentInquiry((prev) => ({
			...prev,
			page: value,
		}));
	};

	const notifyMember = async (input: CreateNotificationInput) => {
		try {
			await createNotification({ variables: { input } });
		} catch (_e) {}
	};

	const createCommentHandler = async () => {
		try {
			if (!user._id) throw new Error(Message.NOT_AUTHENTICATED);
			if (user._id === mbId) throw new Error('Cannot write a review to yourself');
			await createComment({ variables: { input: insertCommentData } });
			setInsertCommentData((prev) => ({ ...prev, commentContent: '' }));
			getCommentsRefetch({ variables: { input: commentInquiry } });
			void notifyMember({
				notificationType: NotificationType.COMMENT,
				notificationGroup: NotificationGroup.COMMENT,
				notificationTitle: 'New comment',
				notificationDesc: `${user.memberNick ?? 'Someone'} commented on your store.`,
				authorId: user._id,
				receiverId: store?._id ?? '',
			});
		} catch (err: any) {
			await sweetMixinErrorAlert(err.message).then();
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
			if (user._id && store?._id) {
				void notifyMember({
					notificationType: NotificationType.LIKE,
					notificationGroup: NotificationGroup.PRODUCT,
					notificationTitle: 'New like',
					notificationDesc: `${user.memberNick ?? 'Someone'} liked your product.`,
					authorId: user._id,
					receiverId: store._id,
				});
			}
		} catch (err: any) {
		}
	};

	if (device === 'mobile') {
		return <div>STORE DETAIL PAGE MOBILE</div>;
	} else {
		return (
			<Stack className={'store-detail-page'}>
				<Stack className={'container'}>
					<Stack className={'store-info'}>
						<Box className={'left'}>
							<img
								src={resolveImageUrl(store?.memberImage, '/img/profile/defaultStore.jpg')}
								alt=""
							/>
							<Box component={'div'} className={'info'}>
								<strong
									style={{ cursor: 'pointer' }}
									onClick={() => redirectToMemberPageHandler(store?._id as string)}
								>
									{store?.memberFullName ?? store?.memberNick}
								</strong>
								<div>
									<img src="/img/icons/call.svg" alt="" />
									<span>{store?.memberPhone}</span>
								</div>
								<div>
									<img src="/img/stores/description.png" alt="Description" />
									<p>
										{store?.memberDesc ??
											'Discover timeless luxury with our handcrafted jewelry collections. Each piece is a symbol of elegance and refined artistry.'}
									</p>
								</div>
								<button
									className="view-profile-btn"
									onClick={() => redirectToMemberPageHandler(store?._id as string)}
								>
									View Profile
								</button>
							</Box>
						</Box>
						<Box className="right">
							<p>“Jewelry is not just an accessory — it’s a memory in gold.”</p>
						</Box>
					</Stack>
					<Stack className={'store-home-list'}>
						<Stack className={'card-wrap'}>
							{storeProducts.map((product: Product) => (
								<div className={'wrap-main'} key={product?._id}>
									<ProductBigCard
										product={product}
										user={userVar()}
										likeProductHandler={likeProductHandler}
										key={product?._id}
									/>
								</div>
							))}
						</Stack>
						<Stack className={'pagination'}>
							{productTotal ? (
								<>
									<Stack className="pagination-box">
										<Pagination
											onChange={productPaginationChangeHandler}
											variant="outlined"
											shape="rounded"
											siblingCount={1}
											boundaryCount={1}
											hidePrevButton={false}
											hideNextButton={false}
											classes={{ ul: 'custom-pagination-ul' }}
										/>
										<Typography className="total-result">
											Showing {productTotal} of {productTotal} products
										</Typography>
									</Stack>
								</>
							) : (
								<div className={'no-data'}>
									<img src="/img/icons/icoAlert.svg" alt="" />
									<p>No products found!</p>
								</div>
							)}
						</Stack>
					</Stack>
					<Stack className={'review-box'}>
						<Stack className={'main-intro'}>
							<span>Reviews</span>
							<p>we are glad to see you again</p>
						</Stack>
						{commentTotal !== 0 && (
							<Stack className={'review-wrap'}>
								<Box component={'div'} className={'title-box'}>
									<StarIcon />
									<span>
										{commentTotal} review{commentTotal > 1 ? 's' : ''}
									</span>
								</Box>
								{storeComments?.map((comment: Comment) => (
									<ReviewCard comment={comment} key={comment?._id} />
								))}
								<Stack className={'pagination'}>
									{commentTotal ? (
										<>
											<Stack className="pagination-box">
												<Pagination
													page={commentInquiry.page}
													count={Math.ceil(commentTotal / commentInquiry.limit)}
													onChange={commentPaginationChangeHandler}
													variant="outlined"
													shape="rounded"
													siblingCount={1}
													boundaryCount={1}
													hidePrevButton={false}
													hideNextButton={false}
													classes={{ ul: 'custom-pagination-ul' }}
												/>
												<Typography className="total-result">
													Showing {commentTotal} of {commentTotal} products
												</Typography>
											</Stack>
										</>
									) : (
										<div className={'no-data'}>
											<img src="/img/icons/icoAlert.svg" alt="" />
											<p>No products found!</p>
										</div>
									)}
								</Stack>
							</Stack>
						)}

						<Stack className={'leave-review-config'}>
							<Typography className={'main-title'}>Leave A Review</Typography>
							<Typography className={'review-title'}>Review</Typography>
							<textarea
								onChange={({ target: { value } }: any) => {
									setInsertCommentData((prev) => ({
										...prev,
										commentContent: value,
									}));
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
										<defs>
											<clipPath id="clip0_6975_3642">
												<rect width="16" height="16" fill="white" transform="translate(0.601562 0.5)" />
											</clipPath>
										</defs>
									</svg>
								</Button>
							</Box>
						</Stack>
					</Stack>
				</Stack>
			</Stack>
		);
	}
};

StoreDetail.defaultProps = {
	initialInput: {
		page: 1,
		limit: 9,
		search: {
			memberId: '',
		},
	},
	initialComment: {
		page: 1,
		limit: 5,
		sort: 'createdAt',
		direction: 'ASC',
		search: {
			commentRefId: '',
		},
	},
};

export default withLayoutBasic(StoreDetail);
