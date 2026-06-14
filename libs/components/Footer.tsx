import FacebookOutlinedIcon from '@mui/icons-material/FacebookOutlined';
import InstagramIcon from '@mui/icons-material/Instagram';
import TelegramIcon from '@mui/icons-material/Telegram';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import useDeviceDetect from '../hooks/useDeviceDetect';
import { Stack, Box, Divider } from '@mui/material';
import moment from 'moment';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';

const Footer = () => {
	const device = useDeviceDetect();
	const [email, setEmail] = useState('');
	const { t } = useTranslation('common');

	const handleSend = () => {
		if (!email) {
			alert('Please enter your email');
			return;
		}
		console.log('Sending email:', email);
		alert(`Subscription request sent for: ${email}`);
	};

	if (device == 'mobile') {
		return (
			<Stack id="footer">
				<Stack className={'footer-container'}>
					<Stack className={'main'}>
						<Stack className="left">
							<Box className="footer-left-top">
								<div className="brand-info">
									<img src="/img/logo/white_on_black2.png" alt="Veloura Logo" className="logo" />
									<p>
										{t(
											'Veloura is a destination for those who believe fragrance is more than a scent—it is an expression of identity, mood, and memory.',
										)}
									</p>
								</div>
							</Box>

							<Box className="footer-left-bottom">
								<h1>{t('Subscribe Our Newsletter')}</h1>
								<p>{t('Stay in the loop with new collections, exclusive drops, and care guides.')}</p>
								<div className="subscribe-row">
									<input
										type="email"
										placeholder="Your Email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') handleSend();
										}}
									/>
									<img
										src="/img/icons/footer-arrow.svg"
										alt="footer-arrow"
										onClick={handleSend}
										style={{ cursor: 'pointer' }}
									/>
								</div>
							</Box>
						</Stack>

						<Stack className={'right'}>
							<Box className={'categories'}>
								<h1>{t('Categories')}</h1>
								<Stack className="categories-list">
									<span>{t('Ring')}</span>
									<span>{t('Necklace')}</span>
									<span>{t('Earrings')}</span>
									<span>{t('Bracelet')}</span>
									<span>{t('Diamond')}</span>
								</Stack>
							</Box>
							<Box className="useful-links">
								<Stack className="useful-list">
									<h1>{t('Useful Links')}</h1>
									<span>{t('About Veloura')}</span>
									<span>{t('Jewelry Guide')}</span>
									<span>{t('Customer Support')}</span>
									<span>{t('Shipping & Returns')}</span>
									<span>{t('Terms & Privacy')}</span>
								</Stack>
							</Box>
						</Stack>
					</Stack>

					<Stack className={'second'}>
						<Box className="divider"></Box>

						<Stack className="row2">
							<Box className="divider" />

							<Stack className="social">
								<FacebookOutlinedIcon />
								<TelegramIcon />
								<InstagramIcon />
								<TwitterIcon />
								<YouTubeIcon />
							</Stack>

							<Box className="divider" />
						</Stack>

						<Stack className="row3">
							<Stack className="bottom">
								<p>
									©Makhmud Kudratov {t('All Rights Reserved')} • {moment().year()}
								</p>
							</Stack>
							<Stack className="payment-cards">
								<img src="/img/footer/Layer_1.svg" alt="Visa" />
								<img src="/img/footer/Layer_2.svg" alt="MasterCard" />
								<img src="/img/footer/Layer_3.svg" alt="PayPal" />
								<img src="/img/footer/Group41.svg" alt="American Express" />
								<img src="/img/footer/Group43.svg" alt="Discover" />
								<img src="/img/footer/Group44.svg" alt="Bitcoin" />
							</Stack>
						</Stack>
					</Stack>
				</Stack>
			</Stack>
		);
	} else {
		return (
			<div id="footer">
			<Stack className={'footer-container'}>
				<Stack className={'main'}>
					<Stack className="left">
						<Box className="footer-left-top">
							<div className="brand-info">
								<img src="/img/logo/white_on_black2.png" alt="Veloura Logo" className="logo" />
								<p>
									{t(
										'Veloura is a destination for those who believe fragrance is more than a scent—it is an expression of identity, mood, and memory.',
									)}
								</p>
							</div>
						</Box>

						<Box className="footer-left-bottom">
							<h1>{t('Subscribe Our Newsletter')}</h1>
							<p>{t('Stay in the loop with new collections, exclusive drops, and care guides.')}</p>
							<div className="subscribe-row">
								<input
									type="email"
									placeholder={t('Your Email')}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') handleSend(); // also send when pressing Enter
									}}
								/>
								<img
									src="/img/icons/footer-arrow.svg"
									alt="footer-arrow"
									onClick={handleSend}
									style={{ cursor: 'pointer' }} // make it clickable
								/>
							</div>
						</Box>
					</Stack>

					<Stack className={'right'}>
						<Box className={'categories'}>
							<h1>{t('Categories')}</h1>
							<Stack className="categories-list">
								<span>{t('Ring')}</span>
								<span>{t('Necklace')}</span>
								<span>{t('Earrings')}</span>
								<span>{t('Bracelet')}</span>
								<span>{t('Diamond')}</span>
							</Stack>
						</Box>
						<Box className={'resources'}>
							<h1>{t('Resources')}</h1>
							<Stack className="resources-list">
								<span>{t('FAQ')}</span>
								<span>{t('Testimonials')}</span>
								<span>{t('Community')}</span>
								<span>{t('Refer-A-Friend')}</span>
								<span>{t('Statement')}</span>
							</Stack>
						</Box>
						<Box className="useful-links">
							<Stack className="useful-list">
								<h1>{t('Useful Links')}</h1>
								<span>{t('About Veloura')}</span>
								<span>{t('Jewelry Guide')}</span>
								<span>{t('Customer Support')}</span>
								<span>{t('Shipping & Returns')}</span>
								<span>{t('Terms & Privacy')}</span>
							</Stack>
						</Box>
					</Stack>
				</Stack>

				{/* Contact strip — direct child of footer-container, matches CSS scope */}
				<div className="row1">
					<div className="content">
						<div className="icon">
							<img src="/img/footer/inquiry.png" alt="Inquiry Icon" />
						</div>
						<div className="info">
							<h1>{t('Having queries?')}</h1>
							<p>{t('Feel free to reach out to us via Chat in our website')}</p>
						</div>
					</div>
					<div className="content">
						<div className="icon">
							<img src="/img/footer/location.png" alt="Location Icon" />
						</div>
						<div className="info">
							<h1>{t('Locate Us')}</h1>
							<p>{t('1234 Veloura St, Suite 100, Seoul City, South Korea')}</p>
						</div>
					</div>
					<div className="content">
						<div className="icon">
							<img src="/img/footer/call.png" alt="Call Icon" />
						</div>
						<div className="info">
							<h1>{t('Call Us')}</h1>
							<p>+82 10-9380-7522</p>
						</div>
					</div>
					<div className="content">
						<div className="icon">
							<img src="/img/footer/inbox.png" alt="Inbox Icon" />
						</div>
						<div className="info">
							<h1>{t('Email Us')}</h1>
							<p>support@veloura.com</p>
						</div>
					</div>
				</div>

				<Stack className={'second'}>
					<Stack className="row2">
						<Box className="divider" />

						<Stack className="social">
							<FacebookOutlinedIcon />
							<TelegramIcon />
							<InstagramIcon />
							<TwitterIcon />
							<YouTubeIcon />
						</Stack>

						<Box className="divider" />
					</Stack>

					<Stack className="row3">
						<Stack className="bottom">
							<p>©Makhmud Kudratov {t('All Rights Reserved')}</p>
						</Stack>
						<Stack className="payment-cards">
							<img src="/img/footer/Layer_1.svg" alt="Visa" />
							<img src="/img/footer/Layer_2.svg" alt="MasterCard" />
							<img src="/img/footer/Layer_3.svg" alt="PayPal" />
							<img src="/img/footer/Group41.svg" alt="American Express" />
							<img src="/img/footer/Group43.svg" alt="Discover" />
							<img src="/img/footer/Group44.svg" alt="Bitcoin" />
						</Stack>
					</Stack>
				</Stack>
			</Stack>
			</div>
		);
	}
};

export default Footer;
