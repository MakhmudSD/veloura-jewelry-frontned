import React, { ChangeEvent, MouseEvent, useEffect, useState } from 'react';
import { NextPage } from 'next';
import {
	Box,
	Button,
	Menu,
	MenuItem,
	Pagination,
	Stack,
	Typography,
	OutlinedInput,
	IconButton,
	Tooltip,
	Skeleton,
} from '@mui/material';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import useDeviceDetect from '../../libs/hooks/useDeviceDetect';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import Filter from '../../libs/components/product/Filter';
import { useRouter } from 'next/router';
import { ProductsInquiry } from '../../libs/types/product/product.input';
import { Product } from '../../libs/types/product/product';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { Direction, Message } from '../../libs/enums/common.enum';
import { GET_PRODUCTS } from '../../apollo/user/query';
import { useMutation, useQuery } from '@apollo/client';
import ProductCard from '../../libs/components/product/ProductCard';
import { CREATE_NOTIFICATION, LIKE_TARGET_PRODUCT } from '../../apollo/user/mutation';
import { T } from '../../libs/types/common';
import { userVar } from '../../apollo/store';
import { sweetMixinErrorAlert } from '../../libs/sweetAlert';
import { CreateNotificationInput } from '../../libs/types/notification/notification';
import { NotificationGroup, NotificationType } from '../../libs/enums/notification.enum';
import { i18n, useTranslation } from 'next-i18next';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const ProductList: NextPage = ({ initialInput, ...props }: any) => {
	const device = useDeviceDetect();
	const router = useRouter();
	const { t } = useTranslation('common');
	const [searchFilter, setSearchFilter] = useState<ProductsInquiry>(
		router?.query?.input ? JSON.parse(router?.query?.input as string) : initialInput,
	);
	const [products, setProducts] = useState<Product[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [sortingOpen, setSortingOpen] = useState(false);
	const [filterSortName, setFilterSortName] = useState('Recommendations');
	const [searchText, setSearchText] = useState<string>('');

	/** APOLLO REQUESTS **/
	const [likeTargetProduct] = useMutation(LIKE_TARGET_PRODUCT);
	const [createNotification] = useMutation(CREATE_NOTIFICATION);

	const {
		loading: getProductsLoading,
		data: getProductsData,
		error: getProductsError,
		refetch: getProductsRefetch,
	} = useQuery(GET_PRODUCTS, {
		fetchPolicy: 'cache-and-network',
		variables: { input: searchFilter },
		notifyOnNetworkStatusChange: true,
		onCompleted: (data) => {
			setProducts(data?.getProducts?.list || []);
			setTotal(data?.getProducts?.metaCounter?.[0]?.total || 0);
		},
	});

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
			if (id !== user._id) {
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

	/** Sync router + refetch products when searchFilter changes **/

	useEffect(() => {
		router.push(`/product?input=${encodeURIComponent(JSON.stringify(searchFilter))}`, undefined, { scroll: false });
		getProductsRefetch({ input: searchFilter });
	}, [searchFilter]);

	/** Debounce auto search for searchText **/
	useEffect(() => {
		const handler = setTimeout(() => {
			setSearchFilter((prev) => ({
				...prev,
				search: { ...prev.search, text: searchText },
			}));
		}, 400);
		return () => clearTimeout(handler);
	}, [searchText]);

	const refreshHandler = async () => {
		try {
			setSearchText('');
			setSearchFilter(initialInput);
			await router.push(
				`/product?input=${JSON.stringify(initialInput)}`,
				`/product?input=${JSON.stringify(initialInput)}`,
				{ scroll: false },
			);
		} catch (err: any) {
			console.log('ERROR, refreshHandler:', err);
		}
	};

	const handlePaginationChange = async (event: ChangeEvent<unknown>, value: number) => {
		const updatedFilter = { ...searchFilter, page: value };
		setSearchFilter(updatedFilter);
		setCurrentPage(value);
	};

	const sortingClickHandler = (e: MouseEvent<HTMLElement>) => {
		setAnchorEl(e.currentTarget);
		setSortingOpen(true);
	};

	const sortingCloseHandler = () => {
		setSortingOpen(false);
		setAnchorEl(null);
	};

	const sortingHandler = (e: React.MouseEvent<HTMLLIElement>) => {
		let updatedFilter = { ...searchFilter };
		switch (e.currentTarget.id) {
			case 'recommendations':
				updatedFilter.sort = 'createdAt';
				updatedFilter.direction = Direction.DESC;
				setFilterSortName('Recommendations');
				break;
			case 'lowest':
				updatedFilter.sort = 'productPrice';
				updatedFilter.direction = Direction.ASC;
				setFilterSortName('Lowest Price');
				break;
			case 'highest':
				updatedFilter.sort = 'productPrice';
				updatedFilter.direction = Direction.DESC;
				setFilterSortName('Highest Price');
				break;
		}
		setSearchFilter(updatedFilter);
		setSortingOpen(false);
		setAnchorEl(null);
	};

	if (device === 'mobile') return <h1>PRODUCTS MOBILE</h1>;

	return (
		<div id="product-list-page">
			<div className="container">
				{/* Search Input Row */}
				<Stack className={'find-your-product'} mb={'30px'}>
					<Stack className={'input-box'}>
						<OutlinedInput
							value={searchText}
							type={'text'}
							className={'search-input'}
							placeholder={'What product are you looking for?'}
							onChange={(e: any) => setSearchText(e.target.value)}
							endAdornment={
								<>
									<img src={'/img/icons/search_icon.png'} alt={''} />
									<CancelRoundedIcon onClick={() => setSearchText('')} style={{ cursor: 'pointer' }} />
								</>
							}
						/>
						<Tooltip title="Clear All">
							<IconButton onClick={refreshHandler}>
								<RefreshIcon />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>

				{/* Filter + Sort Row */}
				<Box className="filter-top-bar">
					<span className="filter-label">
						<i className="fa-solid fa-sliders" /> Filter By:
					</span>
					<Filter searchFilter={searchFilter} setSearchFilter={setSearchFilter} initialInput={initialInput} />
					<Box className="sort-box">
						<span>
							<i className="fa-solid fa-sort-amount-down" /> Sort By:
						</span>{' '}
						<Button onClick={sortingClickHandler} endIcon={<KeyboardArrowDownRoundedIcon />}>
							{filterSortName}
						</Button>
						<Menu anchorEl={anchorEl} open={sortingOpen} onClose={sortingCloseHandler}>
							<MenuItem onClick={sortingHandler} id={'recommendations'} disableRipple>
								Recommendations
							</MenuItem>
							<MenuItem onClick={sortingHandler} id={'lowest'} disableRipple>
								Lowest Price
							</MenuItem>
							<MenuItem onClick={sortingHandler} id={'highest'} disableRipple>
								Highest Price
							</MenuItem>
						</Menu>
					</Box>
				</Box>

				{/* Product List */}
				<Stack className="product-page">
					<Stack className="main-config">
						<Stack className="list-config">
							{getProductsLoading && products.length === 0 ? (
								Array.from({ length: 9 }).map((_, i) => (
									<Box key={i} className="product-skeleton">
										<Skeleton variant="rectangular" width="100%" height={260} sx={{ borderRadius: '12px' }} />
										<Skeleton width="70%" height={28} sx={{ mt: 1 }} />
										<Skeleton width="40%" height={22} />
									</Box>
								))
							) : products.length === 0 ? (
								<div className="no-data">No Products Found! ✨</div>
							) : (
								products.map((product: Product) => (
									<ProductCard
										key={product._id}
										product={product}
										user={userVar()}
										likeProductHandler={likeProductHandler}
									/>
								))
							)}
						</Stack>

						{/* Pagination */}
						{products.length > 0 && (
							<Stack className="pagination-config">
								<Pagination
									page={currentPage}
									count={Math.ceil(total / searchFilter.limit)}
									onChange={handlePaginationChange}
									variant="outlined"
									shape="rounded"
									siblingCount={1}
									boundaryCount={1}
									hidePrevButton={false}
									hideNextButton={false}
									classes={{ ul: 'custom-pagination-ul' }}
								/>
								<Typography className="total-result">
									Showing {products.length} of {total} products
								</Typography>
							</Stack>
						)}
					</Stack>
				</Stack>
			</div>
		</div>
	);
};

ProductList.defaultProps = {
	initialInput: {
		page: 1,
		limit: 9,
		sort: 'createdAt',
		direction: 'DESC',
		search: {},
	},
};

export default withLayoutBasic(ProductList);
