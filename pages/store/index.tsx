import React, { ChangeEvent, MouseEvent, useEffect, useState } from 'react';
import { NextPage } from 'next';
import useDeviceDetect from '../../libs/hooks/useDeviceDetect';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { Stack, Box, Button, Pagination, Typography } from '@mui/material';
import { Menu, MenuItem } from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import StoreCard from '../../libs/components/common/StoreCard';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Member } from '../../libs/types/member/member';
import { CREATE_NOTIFICATION, LIKE_TARGET_MEMBER } from '../../apollo/user/mutation';
import { useMutation, useQuery } from '@apollo/client';
import { GET_STORES } from '../../apollo/user/query';
import { sweetMixinErrorAlert } from '../../libs/sweetAlert';
import { userVar } from '../../apollo/store';
import { CreateNotificationInput } from '../../libs/types/notification/notification';
import { NotificationGroup, NotificationType } from '../../libs/enums/notification.enum';
import { i18n, useTranslation } from 'next-i18next';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const StoreList: NextPage = ({ initialInput, ...props }: any) => {
	const device = useDeviceDetect();
	const router = useRouter();
	const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
	const [filterSortName, setFilterSortName] = useState('Recent');
	const [sortingOpen, setSortingOpen] = useState(false);
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [searchFilter, setSearchFilter] = useState<any>(
		router?.query?.input ? JSON.parse(router?.query?.input as string) : initialInput,
	);
	const [stores, setStores] = useState<Member[]>([]);
	const { t } = useTranslation('common');
	const [total, setTotal] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [searchText, setSearchText] = useState<string>('');

	/** APOLLO REQUESTS **/
	const [likeTargetMember] = useMutation(LIKE_TARGET_MEMBER);
	const [createNotification] = useMutation(CREATE_NOTIFICATION);

	const {
		loading: getStoresLoading,
		data: getStoresData,
		error: getStoresError,
		refetch: getStoresRefetch,
	} = useQuery(GET_STORES, {
		fetchPolicy: 'network-only',
		variables: { input: searchFilter },
		notifyOnNetworkStatusChange: true,
		onCompleted: (data: any) => {
			setStores(data?.getStores?.list);
			setTotal(data?.getStores?.metaCounter[0]?.total);
		},
	});

	/** LIFECYCLES **/
	useEffect(() => {
		if (router.query.input) {
			const input_obj = JSON.parse(router?.query?.input as string);
			setSearchFilter(input_obj);
		} else
			router.replace(`/store?input=${JSON.stringify(searchFilter)}`, `/store?input=${JSON.stringify(searchFilter)}`);

		setCurrentPage(searchFilter.page === undefined ? 1 : searchFilter.page);
	}, [router]);

	useEffect(() => {
		getStoresRefetch({ variables: { input: searchFilter } }).then();
	}, [searchFilter]);

	/** HANDLERS **/

	const sortingClickHandler = (e: MouseEvent<HTMLElement>) => {
		setAnchorEl(e.currentTarget);
		setSortingOpen(true);
	};

	const sortingCloseHandler = () => {
		setSortingOpen(false);
		setAnchorEl(null);
	};

	const sortingHandler = (e: React.MouseEvent<HTMLLIElement>) => {
		switch (e.currentTarget.id) {
			case 'recent':
				setSearchFilter({ ...searchFilter, sort: 'createdAt', direction: 'DESC' });
				setFilterSortName('Recent');
				break;
			case 'old':
				setSearchFilter({ ...searchFilter, sort: 'createdAt', direction: 'ASC' });
				setFilterSortName('Oldest order');
				break;
			case 'likes':
				setSearchFilter({ ...searchFilter, sort: 'memberLikes', direction: 'DESC' });
				setFilterSortName('Likes');
				break;
			case 'views':
				setSearchFilter({ ...searchFilter, sort: 'memberViews', direction: 'DESC' });
				setFilterSortName('Views');
				break;
		}
		setSortingOpen(false);
		setAnchorEl2(null);
	};

	const paginationChangeHandler = async (event: ChangeEvent<unknown>, value: number) => {
		searchFilter.page = value;
		await router.push(`/store?input=${JSON.stringify(searchFilter)}`, `/store?input=${JSON.stringify(searchFilter)}`, {
			scroll: false,
		});
		setCurrentPage(value);
	};

	const notifyMember = async (input: CreateNotificationInput) => {
		try {
			await createNotification({ variables: { input } });
		} catch (_e) {}
	};

	const likeMemberHandler = async (store: Member, id: string) => {
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

			await likeTargetMember({ variables: { input: id } }); // Server update
			await getStoresRefetch({ input: searchFilter }); // Refetch updated list
			if (id !== user._id) {
				void notifyMember({
					notificationType: NotificationType.LIKE,
					notificationGroup: NotificationGroup.MEMBER,
					notificationTitle: 'New like',
					notificationDesc: `${user.memberNick ?? 'Someone'} liked your store.`,
					authorId: user._id,
					receiverId: id,
				});
			}
		} catch (err: any) {
			sweetMixinErrorAlert(err.message).then();
		}
	};

	if (device === 'mobile') {
		return <h1>STORES PAGE MOBILE</h1>;
	} else {
		return (
			<Stack className={'store-list-page'}>
				<Stack className={'container'}>
					<Stack className={'filter'}>
						<Box component={'div'} className={'left'}>
							<div className="search-box">
								<input
									type="text"
									placeholder={'Search for a store'}
									value={searchText}
									onChange={(e: any) => setSearchText(e.target.value)}
									onKeyDown={(event: any) => {
										if (event.key == 'Enter') {
											setSearchFilter({
												...searchFilter,
												search: { ...searchFilter.search, text: searchText },
											});
										}
									}}
								/>
								<button
									className="search-btn"
									onClick={() =>
										setSearchFilter({
											...searchFilter,
											search: { ...searchFilter.search, text: searchText },
										})
									}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<circle cx="11" cy="11" r="8"></circle>
										<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
									</svg>
								</button>
							</div>
						</Box>

						<Box component={'div'} className={'right'}>
							<span>Sort by</span>
							<div>
								<Button onClick={sortingClickHandler} endIcon={<KeyboardArrowDownRoundedIcon />}>
									{filterSortName}
								</Button>
								<Menu anchorEl={anchorEl} open={sortingOpen} onClose={sortingCloseHandler} sx={{ paddingTop: '5px' }}>
									<MenuItem onClick={sortingHandler} id={'recent'} disableRipple>
										Recent
									</MenuItem>
									<MenuItem onClick={sortingHandler} id={'old'} disableRipple>
										Oldest
									</MenuItem>
									<MenuItem onClick={sortingHandler} id={'likes'} disableRipple>
										Likes
									</MenuItem>
									<MenuItem onClick={sortingHandler} id={'views'} disableRipple>
										Views
									</MenuItem>
								</Menu>
							</div>
						</Box>
					</Stack>
					<Stack className={'card-wrapper'}>
						{stores?.length === 0 ? (
							<Box component={'div'} className={'empty-list'}>
								<Box className={'empty-list-content'}>
									<img src="/img/icons/empty.png" alt="" />
									<span>OOPS</span>
									<strong>There are no agents available at the moment</strong>
									<p>
										It is a long established fact that a reader will be distracted by the readable content of a page
										when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal.
									</p>
									<div onClick={() => router.push('/')}>
										<h2>Back to Home</h2>
									</div>
								</Box>
							</Box>
						) : (
							stores.map((store: Member) => {
								return (
									<StoreCard store={store} user={userVar()} likeMemberHandler={likeMemberHandler} key={store._id} />
								);
							})
						)}
					</Stack>
					<Stack className={'pagination'}>
						{stores.length ? (
							<>
								<Stack className="pagination-box">
									<Pagination
										count={Math.ceil(stores.length / initialInput.limit)}
										onChange={paginationChangeHandler}
										variant="outlined"
										shape="rounded"
										siblingCount={1}
										boundaryCount={1}
										hidePrevButton={false}
										hideNextButton={false}
										classes={{ ul: 'custom-pagination-ul' }}
									/>
									<Typography className="total-result">
										Showing {stores.length} of {stores.length} products
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
			</Stack>
		);
	}
};

StoreList.defaultProps = {
	initialInput: {
		page: 1,
		limit: 10,
		sort: 'createdAt',
		direction: 'DESC',
		search: { text: '' },
	},
};

export default withLayoutBasic(StoreList);
