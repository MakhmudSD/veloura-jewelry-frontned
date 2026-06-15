import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Stack, Box } from '@mui/material';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper';
import TopStoreCard from './TopStoreCard';
import { Member } from '../../types/member/member';
import { StoreInquiry } from '../../types/member/member.input';
import { GET_STORES } from '../../../apollo/user/query';
import { useMutation, useQuery } from '@apollo/client';
import { LIKE_TARGET_MEMBER } from '../../../apollo/user/mutation';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { sweetMixinErrorAlert } from '../../sweetAlert';
import { userVar } from '../../../apollo/store';
import { i18n, useTranslation } from 'next-i18next';

interface TopStoresProps {
	initialInput: StoreInquiry;
}

const TopStores = (props: TopStoresProps) => {
	const { initialInput } = props;
	const device = useDeviceDetect();
	const router = useRouter();
	const { t } = useTranslation('common');
	const [topStores, setTopStores] = useState<Member[]>([]);
	const [searchFilter, setSearchFilter] = useState<any>(
		router?.query?.input ? JSON.parse(router?.query?.input as string) : initialInput,
	);

	/** APOLLO **/
	const [likeTargetMember] = useMutation(LIKE_TARGET_MEMBER);

	const {
		loading: getStoresLoading,
		data: getStoresData,
		error: getStoresError,
		refetch: getStoresRefetch,
	} = useQuery(GET_STORES, {
		fetchPolicy: 'cache-and-network',
		variables: { input: initialInput },
		notifyOnNetworkStatusChange: true,
		onCompleted: (data) => {
			// console.log('✅ getStoresData:', data);
			setTopStores(data?.getStores?.list ?? []);
		},
		onError: (error) => {
			console.error('❌ getStoresError:', error);
		},
	});

	/** HANDLERS **/
	const likeMemberHandler = async (_store: Member, id: string) => {
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
			await likeTargetMember({ variables: { input: id } });
			await getStoresRefetch({ input: searchFilter });
		} catch (err: any) {
			console.error('ERROR on likeMemberHandler', err.message);
			sweetMixinErrorAlert(err.message).then();
		}
	};

	const pushStoreHandler = async (storeId: string) => {
		router.push({ pathname: '/store', query: { id: storeId } });
	};

	/* ================= MOBILE ================= */
	if (device === 'mobile') {
		const isLoading = getStoresLoading && topStores.length === 0;
		const hasData = topStores.length > 0;

		return (
			<Stack className={`top-stores mobile`}>
				<Stack className={'container'}>
					<Stack className={'info-box'}>
						<span>{t('Top Stores')}</span>
						<p>{t('Our Top Stores always ready to serve you')}</p>
					</Stack>

					<Stack className={'wrapper'}>
						{isLoading ? (
							<Box className="empty-list">
								<Box className="empty-list-content">
									<img src="/img/icons/empty.png" alt="" />
									<strong>{t('Loading stores…')}</strong>
								</Box>
							</Box>
						) : !hasData ? (
							<Box className="empty-list">
								<Box className="empty-list-content">
									<img src="/img/icons/empty.png" alt="" />
									<span>{t('OOPS')}</span>
									<strong>{t('There are no stores available at the moment')}</strong>
								</Box>
							</Box>
						) : (
							<Swiper
								className={'top-stores-swiper'}
								key={topStores.length} // re-measure when data arrives
								observeParents
								resizeObserver
								updateOnWindowResize
								modules={[Autoplay]}
								centeredSlides
								watchOverflow
								slidesPerView={2}
								spaceBetween={10}
								autoplay={{ delay: 3500, disableOnInteraction: false }}
								breakpoints={{
									0: { slidesPerView: 1.1, spaceBetween: 12, centeredSlides: true },
									480: { slidesPerView: 1.3, spaceBetween: 14, centeredSlides: true },
									768: { slidesPerView: 2, spaceBetween: 16, centeredSlides: true },
								}}
							>
								{topStores.map((store: Member) => (
									<SwiperSlide className={'top-stores-slide'} key={store?._id} style={{ width: 'auto' }}>
										<TopStoreCard store={store} key={store?.memberNick} likeMemberHandler={likeMemberHandler} />
									</SwiperSlide>
								))}
							</Swiper>
						)}
					</Stack>
				</Stack>
			</Stack>
		);
	}

	/* ================= DESKTOP ================= */
	return (
		<Stack className={'top-stores'}>
			<Stack className={'container'}>
				<Stack className={'info-box'}>
					<Box className={'left'}>
						<span>{t('Top Stores')}</span>
					</Box>
					<Box className={'right'}>
						<div className={'more-box'}>
							<span onClick={() => router.push('/store')}>{t('See All Stores')}</span>
							<img src="/img/icons/rightup.svg" alt="" />
						</div>
					</Box>
				</Stack>

				<Stack className={'wrapper'}>
					<Box className={'switch-btn swiper-stores-prev'}>
						<div className="swiper-button-prev"></div>
					</Box>

					<Box className={'card-wrapper'}>
						{topStores.length === 0 ? (
							<Box className={'empty-list'}>
								<Box className={'empty-list-content'}>
									<img src="/img/icons/empty.png" alt="" />
									<span>{t('OOPS')}</span>
									<strong>{t('There are no stores available at the moment')}</strong>
									<p>
										{t(
											'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.',
										)}
									</p>
									<div onClick={() => router.push('/')}>
										<h2>{t('Back to Home')}</h2>
									</div>
								</Box>
							</Box>
						) : (
							<Swiper
								className="top-stores-swiper"
								slidesPerView={2}
								spaceBetween={8}
								watchOverflow
								loop
								autoplay={{ delay: 3800, disableOnInteraction: false, pauseOnMouseEnter: true }}
								modules={[Autoplay, Navigation, Pagination]}
								navigation={{ nextEl: '.swiper-stores-next', prevEl: '.swiper-stores-prev' }}
							>
								{topStores.map((store: Member) => (
									<SwiperSlide className="top-stores-slide" key={store._id}>
										<TopStoreCard store={store} user={userVar()} likeMemberHandler={likeMemberHandler} />
									</SwiperSlide>
								))}
							</Swiper>
						)}
					</Box>

					<Box className={'switch-btn swiper-stores-next'}>
						<div className="swiper-button-next"></div>
					</Box>
				</Stack>
			</Stack>
		</Stack>
	);
};

TopStores.defaultProps = {
	initialInput: {
		page: 1,
		limit: 10,
		direction: 'DESC',
		search: {},
	},
};

export default TopStores;
