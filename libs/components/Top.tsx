import React, { useCallback, useEffect, useState } from 'react';
import { withRouter, useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';

import { useReactiveVar } from '@apollo/client';
import { basketItemsVar, userVar } from '../../apollo/store';
import { getJwtToken, logOut, updateUserInfo } from '../auth';
import { resolveImageUrl } from '../config';

import {
	Badge,
	Box,
	Button,
	Divider,
	Drawer,
	IconButton,
	List,
	ListItemButton,
	ListItemText,
	Menu,
	MenuItem,
	Stack,
	alpha,
	styled,
} from '@mui/material';

import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Logout } from '@mui/icons-material';
import { CaretDown } from 'phosphor-react';

import useDeviceDetect from '../hooks/useDeviceDetect';
import CartDrawer from './common/CartDrawer';
import NotificationBell from './notification/Notification';

const Top = () => {
	const device = useDeviceDetect();
	const user = useReactiveVar(userVar);
	const basketItems = useReactiveVar(basketItemsVar);
	const totalQuantity = basketItems.reduce((sum, item) => sum + item.itemQuantity, 0);

	const { t } = useTranslation('common');
	const router = useRouter();

	const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
	const [lang, setLang] = useState<string | null>('en');
	const drop = Boolean(anchorEl2);

	const [logoutAnchor, setLogoutAnchor] = React.useState<null | HTMLElement>(null);
	const logoutOpen = Boolean(logoutAnchor);

	const [cartOpen, setCartOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const [colorChange, setColorChange] = useState(false);
	const [bgColor, setBgColor] = useState<boolean>(false);

	/* ===== lifecycles ===== */
	useEffect(() => {
		if (localStorage.getItem('locale') === null) {
			localStorage.setItem('locale', 'en');
			setLang('en');
		} else {
			setLang(localStorage.getItem('locale'));
		}
	}, [router]);

	useEffect(() => {
		switch (router.pathname) {
			case '/product/detail':
				setBgColor(true);
				break;
			default:
				setBgColor(false);
				break;
		}
	}, [router]);

	useEffect(() => {
		const jwt = getJwtToken();
		if (jwt) updateUserInfo(jwt);
	}, []);

	// useEffect(() => {
	// 	const marquee = document.querySelector('.marquee');
	// 	if (marquee) {
	// 		marquee.innerHTML += marquee.innerHTML; // clone items for seamless scroll
	// 	}
	// }, []);

	const changeNavbarColor = () => {
		if (window.scrollY > 180) setColorChange(false);
		else setColorChange(true);
	};
	if (typeof window !== 'undefined') window.addEventListener('scroll', changeNavbarColor);

	/* ===== handlers ===== */
	const langClick = (e: any) => setAnchorEl2(e.currentTarget);
	const langClose = () => setAnchorEl2(null);
	const langChoice = useCallback(
		async (e: any) => {
			setLang(e.target.id);
			localStorage.setItem('locale', e.target.id);
			setAnchorEl2(null);
			await router.push(router.asPath, router.asPath, { locale: e.target.id });
		},
		[router],
	);

	const handleCartClick = () => setCartOpen(true);
	const handleCartClose = () => setCartOpen(false);

	const go = (path: string) => {
		setMobileMenuOpen(false);
		router.push(path);
	};
	const isActive = (path: string) => router.pathname === path;

	const StyledMenu = styled((props: any) => (
		<Menu
			elevation={0}
			anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
			transformOrigin={{ vertical: 'top', horizontal: 'right' }}
			{...props}
		/>
	))(({ theme }) => ({
		'& .MuiPaper-root': {
			top: '109px',
			borderRadius: 6,
			marginTop: theme.spacing(1),
			minWidth: 180,
			color: theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
			boxShadow:
				'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
			'& .MuiMenu-list': { padding: '4px 0' },
			'& .MuiMenuItem-root': {
				fontSize: 16 /* +2 */,
				'& .MuiSvgIcon-root': { fontSize: 18, color: theme.palette.text.secondary, marginRight: theme.spacing(1.5) },
				'&:active': { backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity) },
			},
		},
	}));

	/* ===================== MOBILE ===================== */
	if (device === 'mobile') {
		return (
			<>
				{/* Marquee bar (top-most) */}
				<Stack className="mobile-marquee">
					<div className="marquee">
						<div className="track">
							<span>✨ {t('Elevate Every Moment with Veloura')}</span>
							<span>🎁 {t('Best Offers')}</span>
							<span>🏬 {t('100+ Stores')}</span>
							<span>👥 {t('Thousands of Happy Users')}</span>
							<span>🌿 {t('Curated Scents for Every Mood')}</span>
							<span>💎 {t('Premium Ingredients')}</span>
						</div>
					</div>
				</Stack>

				{/* Top bar: LEFT menu, CENTER logo, RIGHT cart */}
				<Stack className="mobile-topbar" direction="row" alignItems="center" justifyContent="space-between">
					{/* Left: Menu */}
					<IconButton aria-label="menu" onClick={() => setMobileMenuOpen(true)} size="large" className="btn-menu">
						<MenuRoundedIcon />
					</IconButton>

					{/* Center: Logo (smaller) */}
					<Box className="mobile-logo">
						<Link href="/" aria-label="Veloura Home">
							<img src="/img/logo/black_on_white2.png" alt="Veloura Logo" className="logo" />
						</Link>
					</Box>

					{/* Right: Cart */}
					<IconButton aria-label="cart" onClick={handleCartClick} size="large" className="btn-cart">
						<Badge badgeContent={totalQuantity} color="secondary">
							<img src="/img/icons/shop-bag.svg" alt="Shopping Cart" />
						</Badge>
					</IconButton>
					<CartDrawer open={cartOpen} onClose={handleCartClose} />
				</Stack>

				{/* Compact banner */}
				<Box className="mobile-banner" role="img" aria-label="Veloura featured jewelry" />

				{/* Left Drawer Menu */}
				<Drawer anchor="left" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
					<Box className="mobile-menu" sx={{ width: 300, display: 'flex', flexDirection: 'column', height: '100%' }}>
						{/* Drawer Header */}
						<Box className="mobile-menu-header">
							<img src="/img/logo/black_on_white2.png" alt="Veloura" className="menu-logo" />
							<IconButton aria-label="close menu" onClick={() => setMobileMenuOpen(false)}>
								<CloseRoundedIcon />
							</IconButton>
						</Box>
						<Divider />

						{/* Nav Items */}
						<List className="mobile-menu-list">
							<ListItemButton selected={isActive('/')} onClick={() => go('/')}>
								<ListItemText primaryTypographyProps={{ sx: { fontSize: 17 } }} primary={t('Home')} />
								{isActive('/') && <img src="/img/icons/page-locator.png" alt="Current page" className="page-locator" />}
							</ListItemButton>

							<ListItemButton selected={isActive('/product')} onClick={() => go('/product')}>
								<ListItemText primaryTypographyProps={{ sx: { fontSize: 17 } }} primary={t('Products')} />
								{isActive('/product') && (
									<img src="/img/icons/page-locator.png" alt="Current page" className="page-locator" />
								)}
							</ListItemButton>

							<ListItemButton selected={isActive('/store')} onClick={() => go('/store')}>
								<ListItemText primaryTypographyProps={{ sx: { fontSize: 17 } }} primary={t('Stores')} />
								{isActive('/store') && (
									<img src="/img/icons/page-locator.png" alt="Current page" className="page-locator" />
								)}
							</ListItemButton>

							<ListItemButton selected={isActive('/community')} onClick={() => go('/community')}>
								<ListItemText primaryTypographyProps={{ sx: { fontSize: 17 } }} primary={t('Community')} />
								{isActive('/community') && (
									<img src="/img/icons/page-locator.png" alt="Current page" className="page-locator" />
								)}
							</ListItemButton>

							<ListItemButton selected={isActive('/cs')} onClick={() => go('/cs')}>
								<ListItemText primaryTypographyProps={{ sx: { fontSize: 17 } }} primary={t('CS')} />
								{isActive('/cs') && (
									<img src="/img/icons/page-locator.png" alt="Current page" className="page-locator" />
								)}
							</ListItemButton>

							{user?._id && (
								<ListItemButton selected={isActive('/mypage')} onClick={() => go('/mypage')}>
									<ListItemText primaryTypographyProps={{ sx: { fontSize: 17 } }} primary={t('My Page')} />
									{isActive('/mypage') && (
										<img src="/img/icons/page-locator.png" alt="Current page" className="page-locator" />
									)}
								</ListItemButton>
							)}
						</List>

						<Box sx={{ flexGrow: 1 }} />

						{/* Footer: language + auth */}
						<Divider />
						<Box className="mobile-menu-footer">
							<Button variant="outlined" size="small" onClick={langClick} className="btn-lang">
								{t('Language')}
							</Button>

							{user?._id ? (
								<Button
									variant="text"
									size="small"
									onClick={() => {
										setMobileMenuOpen(false);
										logOut();
									}}
									startIcon={<Logout fontSize="small" />}
								>
									{t('Logout')}
								</Button>
							) : (
								<Link href="/account/join">
									<Button variant="contained" size="small" onClick={() => setMobileMenuOpen(false)}>
										{t('Login')}
									</Button>
								</Link>
							)}
						</Box>
					</Box>
				</Drawer>

				{/* Language menu */}
				<StyledMenu anchorEl={anchorEl2} open={drop} onClose={langClose}>
					<MenuItem disableRipple onClick={langChoice} id="en">
						<Box component="div" sx={{ width: 24, height: 18, borderRadius: '3px', overflow: 'hidden', mr: 1 }}>
							<img
								src="/img/flag/langen.png"
								alt="usaFlag"
								style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
							/>
						</Box>
						{t('English')}
					</MenuItem>
					<MenuItem disableRipple onClick={langChoice} id="kr">
						<Box component="div" sx={{ width: 24, height: 18, borderRadius: '3px', overflow: 'hidden', mr: 1 }}>
							<img
								src="/img/flag/langkr.png"
								alt="koreanFlag"
								style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
							/>
						</Box>
						{t('Korean')}
					</MenuItem>
					<MenuItem disableRipple onClick={langChoice} id="uz">
						<Box component="div" sx={{ width: 24, height: 18, borderRadius: '3px', overflow: 'hidden', mr: 1 }}>
							<img
								src="/img/flag/languz.png"
								alt="uzbekFlag"
								style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
							/>
						</Box>
						{t('Uzbek')}
					</MenuItem>
				</StyledMenu>
			</>
		);
	}

	/* ===================== DESKTOP (unchanged) ===================== */
	return (
		<>
			<div className="page-loader"></div>
			<div className="navbar">
				{/* Top Navbar */}
				<div className={`navbar-main`}>
					<div className="container">
						<div className="top-navbar">
							<div className="top-left">
								<div className="marquee">
									<span>✨ {t('Elevate Every Moment with Veloura')}</span>
									<span>🎁 {t('Best Offers')}</span>
									<span>🏬 {t('100+ Stores')}</span>
									<span>💎 {t('Top-notch Brands')}</span>
									<span>👥 {t('Thousands of Happy Users')}</span>
									<span>🎁 {t('Aesthetic Gift Sets')}</span>
									<span>🌿 {t('Curated Scents for Every Mood')}</span>
									<span>💎 {t('Premium Ingredients')}</span>

									<span>✨ {t('Elevate Every Moment with Veloura')}</span>
									<span>🎁 {t('Best Offers')}</span>
									<span>🏬 {t('100+ Stores')}</span>
									<span>💎 {t('Top-notch Brands')}</span>
									<span>👥 {t('Thousands of Happy Users')}</span>
									<span>🎁 {t('Aesthetic Gift Sets')}</span>
									<span>🌿 {t('Curated Scents for Every Mood')}</span>
									<span>💎 {t('Premium Ingredients')}</span>
								</div>
							</div>
						</div>

						{/* Bottom Navbar */}
						<div className={`bottom-navbar ${colorChange ? 'colored' : 'transparent'}`}>
							<div className="bottom-left">
								<Link href="/">
									<div className={`nav-item ${router.pathname === '/' ? 'active' : ''}`}>
										{t('Home')}
										{router.pathname === '/' && (
											<img src="/img/icons/page-locator.png" alt="Page Locator" className="page-locator" />
										)}
									</div>
								</Link>
								<Link href="/product">
									<div className={`nav-item ${router.pathname === '/product' ? 'active' : ''}`}>
										{t('Products')}
										{router.pathname === '/product' && (
											<img src="/img/icons/page-locator.png" alt="Page Locator" className="page-locator" />
										)}
									</div>
								</Link>
								<Link href="/store">
									<div className={`nav-item ${router.pathname === '/store' ? 'active' : ''}`}>
										{t('Stores')}
										{router.pathname === '/store' && (
											<img src="/img/icons/page-locator.png" alt="Page Locator" className="page-locator" />
										)}
									</div>
								</Link>
								<Link href="/community">
									<div className={`nav-item ${router.pathname === '/community' ? 'active' : ''}`}>
										{t('Community')}
										{router.pathname === '/community' && (
											<img src="/img/icons/page-locator.png" alt="Page Locator" className="page-locator" />
										)}
									</div>
								</Link>
								{user?._id && (
									<Link href="/mypage">
										<div className={`nav-item ${router.pathname === '/mypage' ? 'active' : ''}`}>
											{t('My Page')}
											{router.pathname === '/mypage' && (
												<img src="/img/icons/page-locator.png" alt="Page Locator" className="page-locator" />
											)}
										</div>
									</Link>
								)}
								<Link href="/cs">
									<div className={`nav-item ${router.pathname === '/cs' ? 'active' : ''}`}>
										{t('CS')}
										{router.pathname === '/cs' && (
											<img src="/img/icons/page-locator.png" alt="Page Locator" className="page-locator" />
										)}
									</div>
								</Link>
							</div>
							<div className="bottom-center">
								<div className="logo-box">
									<Link href="/">
										<img src="/img/logo/black_on_white2.png" alt="Veloura Logo" className="logo" />
									</Link>
								</div>
							</div>
							<div className="bottom-right">
								<Box component={'div'} className={'user-box'}>
									{user?._id ? (
										<>
											<IconButton aria-label="cart" onClick={handleCartClick} size="large">
												<Badge badgeContent={totalQuantity} color="secondary">
													<img src="/img/icons/shop-bag.svg" alt="Shopping Cart" />
												</Badge>
											</IconButton>
											<CartDrawer open={cartOpen} onClose={handleCartClose} />

											<div className={'login-user'} onClick={(event: any) => setLogoutAnchor(event.currentTarget)}>
												<img
													src={resolveImageUrl(user?.memberImage, '/img/profile/defaultUser3.svg')}
													alt=""
												/>
											</div>

											<Menu
												id="basic-menu"
												anchorEl={logoutAnchor}
												open={logoutOpen}
												onClose={() => {
													setLogoutAnchor(null);
												}}
												sx={{ mt: '5px' }}
											>
												<MenuItem onClick={() => logOut()}>
													<Logout fontSize="small" style={{ color: 'blue', marginRight: '10px' }} />
													<span>{t('Logout')}</span>
													</MenuItem>
											</Menu>
										</>
									) : (
										<Link href={'/account/join'}>
											<div className={'join-box'}>
												<span>{t('Login')}</span>
											</div>
										</Link>
									)}

									<div className="lan-box">
										{user?._id && <NotificationBell />}{' '}
										<Button
											disableRipple
											className="btn-lang"
											onClick={langClick}
											endIcon={<CaretDown size={14} color="#616161" weight="fill" />}
										>
											<Box component="div" className="flag">
												{lang !== null ? (
													<img src={`/img/flag/lang${lang}.png`} alt={`${lang}Flag`} />
												) : (
													<img src={`/img/flag/langen.png`} alt="usaFlag" />
												)}
											</Box>
										</Button>
										<StyledMenu anchorEl={anchorEl2} open={drop} onClose={langClose}>
											<MenuItem disableRipple onClick={langChoice} id="en">
												<Box
													component="div"
													sx={{ width: 24, height: 18, borderRadius: '3px', overflow: 'hidden', mr: 1 }}
												>
													<img
														src="/img/flag/langen.png"
														alt="usaFlag"
														style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
													/>
												</Box>
												{t('English')}
											</MenuItem>

											<MenuItem disableRipple onClick={langChoice} id="kr">
												<Box
													component="div"
													sx={{ width: 24, height: 18, borderRadius: '3px', overflow: 'hidden', mr: 1 }}
												>
													<img
														src="/img/flag/langkr.png"
														alt="koreanFlag"
														style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
													/>
												</Box>
												{t('Korean')}
											</MenuItem>

											<MenuItem disableRipple onClick={langChoice} id="uz">
												<Box
													component="div"
													sx={{ width: 24, height: 18, borderRadius: '3px', overflow: 'hidden', mr: 1 }}
												>
													<img
														src="/img/flag/languz.png"
														alt="uzbekFlag"
														style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
													/>
												</Box>
												{t('Uzbek')}
											</MenuItem>
										</StyledMenu>
									</div>
								</Box>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default withRouter(Top);
