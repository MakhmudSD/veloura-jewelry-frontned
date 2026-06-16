import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { Pagination, Stack, Typography } from '@mui/material';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { useMutation, useQuery, useReactiveVar } from '@apollo/client';
import { Product } from '../../types/product/product';
import { StoreProductsInquiry } from '../../types/product/product.input';
import { T } from '../../types/common';
import { ProductStatus } from '../../enums/product.enum';
import { userVar } from '../../../apollo/store';
import { useRouter } from 'next/router';
import { UPDATE_PRODUCT } from '../../../apollo/user/mutation';
import { GET_STORE_PRODUCTS } from '../../../apollo/user/query';
import { sweetErrorHandling, sweetTopSmallSuccessAlert } from '../../sweetAlert';
import { ProductCard } from './ProductCard';

const MyProducts: NextPage = ({ initialInput, ...props }: any) => {
	const device = useDeviceDetect();
	const [searchFilter, setSearchFilter] = useState<StoreProductsInquiry>(initialInput);
	const [storeProducts, setStoreProducts] = useState<Product[]>([]);
	const [total, setTotal] = useState<number>(0);
	const user = useReactiveVar(userVar);
	const router = useRouter();

	/** APOLLO REQUESTS **/
	const [updateProduct] = useMutation(UPDATE_PRODUCT);

	const {
		loading: getStoreProductsLoading,
		data: getStoreProductsData,
		error: getStoreProductsError,
		refetch: getStoreProductsRefetch,
	} = useQuery(GET_STORE_PRODUCTS, {
		fetchPolicy: 'network-only',
		variables: { input: searchFilter },
		notifyOnNetworkStatusChange: true,
	});

	useEffect(() => {
		if (getStoreProductsData?.getStoreProducts?.list) {
			setStoreProducts(getStoreProductsData.getStoreProducts.list);
			setTotal(getStoreProductsData.getStoreProducts.metaCounter?.[0]?.total ?? 0);
		}
	}, [getStoreProductsData]);

	/** HANDLERS **/
	const paginationHandler = (e: T, value: number) => {
		setSearchFilter({ ...searchFilter, page: value });
	};

	const changeStatusHandler = (value: ProductStatus) => {
		setSearchFilter({ ...searchFilter, search: { productStatus: value } });
	};

	const deleteProductHandler = async (id: string) => {
		try {
			if (sweetConfirmAlert('Are you sure you want to delete this product?')) {
				await updateProduct({ variables: { input: { _id: id, productStatus: 'DELETE' } } });
				console.log('Refetching data...');
				await sweetTopSmallSuccessAlert('Product deleted successfully!');
				await getStoreProductsRefetch({ input: searchFilter });
			}
		} catch (err: any) {
			await sweetErrorHandling(err);
		}
	};
	const updateProductHandler = async (status: string, id: string) => {
		try {
			if (sweetConfirmAlert(`Are you sure you want to update this product status to ${status}?`)) {
				await updateProduct({ variables: { input: { _id: id, productStatus: status } } });
			}
			console.log('Refetching data...');
			await getStoreProductsRefetch({ input: searchFilter });
		} catch (err: any) {
			console.error('Mutation failed:', err);
			await sweetErrorHandling(err);
		}
	};
	if (user?.memberType !== 'STORE') {
		router.back();
	}

	if (device === 'mobile') {
		return <div>VELOURA PRODUCTS MOBILE</div>;
	} else {
		return (
			<div id="my-product-page">
				<Stack className="main-title-box">
					<Stack className="right-box">
						<Typography className="main-title">My Products</Typography>
						<Typography className="sub-title">We are glad to see you again!</Typography>
					</Stack>
				</Stack>
				<Stack className="product-list-box">
					<Stack className="tab-name-box">
						<Typography
							onClick={() => changeStatusHandler(ProductStatus.AVAILABLE)}
							className={searchFilter.search.productStatus === 'AVAILABLE' ? 'active-tab-name' : 'tab-name'}
						>
							On Sale
						</Typography>
						<Typography
							onClick={() => changeStatusHandler(ProductStatus.SOLD)}
							className={searchFilter.search.productStatus === 'SOLD' ? 'active-tab-name' : 'tab-name'}
						>
							On Sold
						</Typography>
					</Stack>
					<Stack className="list-box">
						<Stack className="listing-title-box">
							<Typography className="title-text">Listing title</Typography>
							<Typography className="title-text">Date Published</Typography>
							<Typography className="title-text">Status</Typography>
							<Typography className="title-text">View</Typography>
							<Typography className="title-text">Action</Typography>
						</Stack>

						{storeProducts?.length === 0 ? (
							<div className={'no-data'}>
								<img src="/img/icons/icoAlert.svg" alt="" />
								<p>No product found!</p>
							</div>
						) : (
							storeProducts.map((product: Product) => {
								return (
									<ProductCard
										product={product}
										deleteProductHandler={deleteProductHandler}
										updateProductHandler={updateProductHandler}
									/>
								);
							})
						)}

						{storeProducts.length !== 0 && (
							<Stack className="pagination-config">
								<Stack className="pagination-box">
									<Pagination
										count={Math.ceil(total / searchFilter.limit)}
										page={searchFilter.page}
										shape="circular"
										color="primary"
										onChange={paginationHandler}
									/>
								</Stack>
								<Stack className="total-result">
									<Typography>{total} Product available</Typography>
								</Stack>
							</Stack>
						)}
					</Stack>
				</Stack>
			</div>
		);
	}
};

MyProducts.defaultProps = {
	initialInput: {
		page: 1,
		limit: 5,
		sort: 'createdAt',
		search: {
			productStatus: 'AVAILABLE',
		},
	},
};

export default MyProducts;
function sweetConfirmAlert(message: string): boolean {
	return window.confirm(message); // Use browser's confirm dialog for simplicity
}
