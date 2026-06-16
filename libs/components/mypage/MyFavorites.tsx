import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { Pagination, Stack, Typography } from '@mui/material';
import { Product } from '../../types/product/product';
import { T } from '../../types/common';
import { useMutation, useQuery } from '@apollo/client';
import { CREATE_NOTIFICATION, LIKE_TARGET_PRODUCT } from '../../../apollo/user/mutation';
import { GET_FAVORITES } from '../../../apollo/user/query';
import { Messages } from '../../config';
import { sweetMixinErrorAlert } from '../../sweetAlert';
import ProductCard from '../product/ProductCard';
import { NotificationGroup, NotificationType } from '../../enums/notification.enum';
import { CreateNotificationInput } from '../../types/notification/notification';

const MyFavorites: NextPage = () => {
	const device = useDeviceDetect();
	const [myFavorites, setMyFavorites] = useState<Product[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [searchFavorites, setSearchFavorites] = useState<T>({ page: 1, limit: 6 });

	/** APOLLO REQUESTS **/
	const [likeTargetProduct] = useMutation(LIKE_TARGET_PRODUCT);
	const [createNotification] = useMutation(CREATE_NOTIFICATION);

	const {
		loading: getFavoritesLoading,
		error: getFavoritesError,
		data: getFavoritesData,
		refetch: getFavoritesRefetch,
	} = useQuery(GET_FAVORITES, {
		fetchPolicy: 'network-only',
		variables: { input: searchFavorites },
	});

	useEffect(() => {
		if (getFavoritesData?.getFavorites?.list) {
			setMyFavorites(getFavoritesData.getFavorites.list);
			setTotal(getFavoritesData.getFavorites.metaCounter?.[0]?.total || 0);
		}
	}, [getFavoritesData]);

	const notifyMember = async (input: CreateNotificationInput) => {
		try {
			await createNotification({ variables: { input } });
		} catch (_e) {}
	};

	const likeProductHandler = async (e: T, user: any, id: string) => {
		try {
			e.stopPropagation();
			if (!id) return;
			if (!user?._id) throw new Error(Messages.error2);

			const product = myFavorites?.find((p: Product) => p._id === id);
			await likeTargetProduct({ variables: { input: id } });
			await getFavoritesRefetch({ input: searchFavorites });
			if (product?.memberData?._id && product.memberData._id !== user._id) {
				void notifyMember({
					notificationType: NotificationType.LIKE,
					notificationGroup: NotificationGroup.PRODUCT,
					notificationTitle: 'New like',
					notificationDesc: `${user.memberNick ?? 'Someone'} liked your product.`,
					authorId: user._id,
					receiverId: product.memberData._id,
				});
			}
		} catch (err: any) {
			sweetMixinErrorAlert(err.message).then();
		}
	};

	/** HANDLERS **/
	const paginationHandler = (e: T, value: number) => {
		setSearchFavorites({ ...searchFavorites, page: value });
	};

	if (device === 'mobile') {
		return <div>VELOURA MY FAVORITES MOBILE</div>;
	} else {
		return (
			<div id="my-favorites-page">
				<Stack className="main-title-box">
					<Stack className="right-box">
						<Typography className="main-title">My Favorites</Typography>
						<Typography className="sub-title">We are glad to see you again!</Typography>
					</Stack>
				</Stack>
				<Stack className="favorites-list-box">
					{myFavorites?.length ? (
						myFavorites?.map((product: Product) => {
							return (
								<ProductCard
									product={product}
									key={product._id}
									likeProductHandler={likeProductHandler}
									myFavorites={true}
								/>
							);
						})
					) : (
						<div className={'no-data'}>
							<img src="/img/icons/icoAlert.svg" alt="" />
							<p>No Favorites found!</p>
						</div>
					)}
				</Stack>
				{myFavorites?.length ? (
					<Stack className="pagination-config">
						<Stack className="pagination-box">
							<Pagination
								count={Math.ceil(total / searchFavorites.limit)}
								page={searchFavorites.page}
								shape="circular"
								color="primary"
								onChange={paginationHandler}
							/>
						</Stack>
						<Stack className="total-result">
							<Typography>
								Total {total} favorite product{total > 1 ? 's' : ''}
							</Typography>
						</Stack>
					</Stack>
				) : null}
			</div>
		);
	}
};

export default MyFavorites;
