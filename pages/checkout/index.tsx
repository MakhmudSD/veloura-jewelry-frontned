import React, { useState } from 'react';
import {
	Box,
	Button,
	Typography,
	TextField,
	Stack,
	Checkbox,
	FormControlLabel,
	Divider,
	IconButton,
	CircularProgress,
	Link,
	Tooltip,
} from '@mui/material';
import { useReactiveVar, useMutation } from '@apollo/client';
import { useRouter } from 'next/router';
import { basketItemsVar, clearBasket, userVar } from '../../apollo/store';
import { CREATE_ORDER } from '../../apollo/user/mutation';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BlockIcon from '@mui/icons-material/Block';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LockIcon from '@mui/icons-material/Lock';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { sweetErrorHandling } from '../../libs/sweetAlert';

/* ── Card-type detection ─────────────────────────────── */
function detectCardType(num: string): 'visa' | 'mastercard' | 'amex' | 'generic' {
	const n = num.replace(/\s/g, '');
	if (/^4/.test(n)) return 'visa';
	if (/^5[1-5]|^2[2-7]/.test(n)) return 'mastercard';
	if (/^3[47]/.test(n)) return 'amex';
	return 'generic';
}

const CARD_LABELS: Record<ReturnType<typeof detectCardType>, string> = {
	visa: 'VISA',
	mastercard: 'Mastercard',
	amex: 'Amex',
	generic: '',
};

function formatCardNumber(value: string, type: ReturnType<typeof detectCardType>): string {
	const digits = value.replace(/\D/g, '').slice(0, type === 'amex' ? 15 : 16);
	if (type === 'amex') {
		return digits.replace(/^(\d{4})(\d{6})(\d{0,5}).*/, (_m, a, b, c) =>
			[a, b, c].filter(Boolean).join(' '),
		);
	}
	return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
	const digits = value.replace(/\D/g, '').slice(0, 4);
	if (digits.length > 2) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
	return digits;
}

/* ── Demo card numbers ───────────────────────────────── */
const DEMO_CARDS = [
	{ label: 'Visa', number: '4111 1111 1111 1111', cvv: '123', expiry: '12 / 28' },
	{ label: 'Mastercard', number: '5500 0000 0000 0004', cvv: '321', expiry: '08 / 27' },
];

/* ── Checkout page ───────────────────────────────────── */
const Checkout = () => {
	const basketItems = useReactiveVar(basketItemsVar);
	const user = useReactiveVar(userVar);
	const router = useRouter();

	const [specialInstructions, setSpecialInstructions] = useState('');
	const [agreeTerms, setAgreeTerms] = useState(false);
	const [giftWrap, setGiftWrap] = useState(false);
	const [shippingFee, setShippingFee] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);

	const [cardName, setCardName] = useState('');
	const [cardNumber, setCardNumber] = useState('');
	const [cardExpiry, setCardExpiry] = useState('');
	const [cardCvv, setCardCvv] = useState('');
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const [createOrder] = useMutation(CREATE_ORDER);

	const cardType = detectCardType(cardNumber);
	const maxCvv = cardType === 'amex' ? 4 : 3;

	if (user?.memberType !== 'USER') {
		return (
			<Box p={5} textAlign="center">
				<Typography
					variant="h3"
					fontWeight={600}
					sx={{
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						alignItems: 'center',
						gap: 1,
						color: '#a94442',
						fontFamily: 'Playfair Display, serif',
						marginBottom: 2,
					}}
				>
					<BlockIcon sx={{ fontSize: 78 }} />
					Only regular users can place orders.
				</Typography>
			</Box>
		);
	}

	const handleQuantityChange = (id: string, delta: number) => {
		const updated = [...basketItemsVar()];
		const index = updated.findIndex((i) => i.productId === id);
		if (index > -1) {
			updated[index].itemQuantity = Math.max(1, updated[index].itemQuantity + delta);
			basketItemsVar(updated);
		}
	};

	const handleRemove = (id: string) => {
		const filtered = basketItemsVar().filter((i) => i.productId !== id);
		basketItemsVar(filtered);
	};

	const subtotal = basketItems.reduce((acc, item) => acc + item.productPrice * item.itemQuantity, 0);
	const giftWrapFee = giftWrap ? 10000 : 0;
	const total = subtotal + (shippingFee ?? 0) + giftWrapFee;

	/* Validation */
	const validate = (): boolean => {
		const errs: Record<string, string> = {};
		if (!cardName.trim()) errs.cardName = 'Cardholder name is required';
		const raw = cardNumber.replace(/\s/g, '');
		if (raw.length < (cardType === 'amex' ? 15 : 16)) errs.cardNumber = 'Enter a valid card number';
		const parts = cardExpiry.replace(/\s/g, '').split('/');
		const mo = parseInt(parts[0] || '0', 10);
		const yr = parseInt(parts[1] || '0', 10) + 2000;
		const now = new Date();
		if (!parts[0] || !parts[1] || mo < 1 || mo > 12 || yr < now.getFullYear() || (yr === now.getFullYear() && mo < now.getMonth() + 1)) {
			errs.cardExpiry = 'Enter a valid expiry date';
		}
		if (cardCvv.length < maxCvv) errs.cardCvv = `CVV must be ${maxCvv} digits`;
		if (!agreeTerms) errs.agreeTerms = 'You must agree to the terms';
		setFieldErrors(errs);
		return Object.keys(errs).length === 0;
	};

	const fillDemoCard = (card: (typeof DEMO_CARDS)[number]) => {
		setCardNumber(card.number);
		setCardExpiry(card.expiry);
		setCardCvv(card.cvv);
		setCardName('Demo User');
		setFieldErrors({});
	};

	const handleFakePayment = async () => {
		if (!validate()) return;
		setLoading(true);
		try {
			const { data } = await createOrder({
				variables: {
					input: basketItems.map((item) => ({
						productId: item.productId,
						itemQuantity: item.itemQuantity,
						itemPrice: item.productPrice,
					})),
				},
			});

			const newOrder = data?.createOrder;
			const newOrderId = newOrder?._id;
			const orderTotal = newOrder?.orderTotal ?? total;

			try {
				sessionStorage.setItem('lastOrderId', String(newOrderId ?? ''));
				sessionStorage.setItem('lastOrderTotal', String(orderTotal ?? ''));
			} catch {}

			clearBasket();
			router.push({
				pathname: '/checkout/success',
				query: { orderId: String(newOrderId ?? ''), total: String(orderTotal ?? '') },
			});
		} catch (err: any) {
			sweetErrorHandling(err);
			setLoading(false);
		}
	};

	return (
		<Box id="checkout-page" className="checkout-container">
			<Typography variant="h4" className="checkout-title">
				Your Cart
			</Typography>

			<Stack direction="row" spacing={4}>
				{/* LEFT: Cart Items */}
				<Box className="checkout-left">
					{basketItems.map((item) => (
						<Stack key={item.productId} direction="row" spacing={2} className="checkout-item">
							<img src={item.productImages} alt={item.productTitle} width={80} height={80} />
							<Box className="checkout-item-info">
								<Typography>{item.productTitle}</Typography>
								<Typography>₩{item.productPrice.toLocaleString()}</Typography>
								<Stack spacing={0.25} sx={{ mt: 0.5 }}>
									{typeof item.weight !== 'undefined' && item.weight !== null && (
										<Typography variant="body2" sx={{ color: '#7a6a58' }}>
											• Weight: <b>{item.weight}</b>
										</Typography>
									)}
									{typeof item.ringSize !== 'undefined' && item.ringSize !== null && (
										<Typography variant="body2" sx={{ color: '#7a6a58' }}>
											• Size: <b>{item.ringSize}</b>
										</Typography>
									)}
									{item.memberId && item.memberNick && (
										<Typography variant="body2" sx={{ color: '#7a6a58' }}>
											• Seller:{' '}
											<Link
												href={`/store/detail?id=${item.memberId}`}
												style={{ color: '#b8860b', textDecoration: 'none', fontWeight: 500 }}
											>
												{item.memberNick}
											</Link>
										</Typography>
									)}
								</Stack>
							</Box>
							<Stack direction="row" spacing={1} alignItems="center">
								<Button onClick={() => handleQuantityChange(item.productId, -1)}>-</Button>
								<Typography>{item.itemQuantity}</Typography>
								<Button onClick={() => handleQuantityChange(item.productId, 1)}>+</Button>
							</Stack>
							<Typography>₩{(item.productPrice * item.itemQuantity).toLocaleString()}</Typography>
							<IconButton onClick={() => handleRemove(item.productId)}>
								<DeleteOutlineIcon />
							</IconButton>
						</Stack>
					))}

					<Box className="checkout-note">
						<Typography>Order Special Instructions:</Typography>
						<TextField
							placeholder="Additional Information"
							multiline
							fullWidth
							rows={1}
							value={specialInstructions}
							onChange={(e) => setSpecialInstructions(e.target.value)}
						/>
					</Box>

					<FormControlLabel
						control={<Checkbox checked={giftWrap} onChange={() => setGiftWrap(!giftWrap)} />}
						label="Gift wrap your purchase for just ₩10,000"
					/>
				</Box>

				{/* RIGHT: Checkout Summary */}
				<Box className="checkout-summary">
					<Typography variant="h6">Shipping Estimates</Typography>
					<TextField fullWidth placeholder="Country / Region" />
					<TextField fullWidth placeholder="State" />
					<TextField fullWidth placeholder="Postal / Zip Code" />
					<Button onClick={() => setShippingFee(30000)}>Calculate Shipping</Button>

					<Divider />

					<Typography>Subtotal: ₩{subtotal.toLocaleString()}</Typography>
					{shippingFee !== null && <Typography>Shipping Fee: ₩{shippingFee.toLocaleString()}</Typography>}
					{giftWrap && <Typography>Gift Wrap: ₩{giftWrapFee.toLocaleString()}</Typography>}
					<Typography sx={{ fontWeight: 700, color: '#5c4432 !important' }}>
						Total: ₩{total.toLocaleString()}
					</Typography>

					<Divider />

					{/* ── Payment panel ── */}
					<Box className="co-pay">
						{/* Demo mode badge */}
						<Box className="co-pay__demo-badge">
							<LockIcon sx={{ fontSize: 13 }} />
							DEMO MODE — no real charge
						</Box>

						<Typography variant="h6" className="co-pay__title">
							Card Payment
						</Typography>

						{/* Quick-fill demo cards */}
						<Box className="co-pay__demo-cards">
							{DEMO_CARDS.map((c) => (
								<button key={c.label} className="co-pay__demo-fill" onClick={() => fillDemoCard(c)}>
									Use {c.label} test card
								</button>
							))}
						</Box>

						{/* Card type pill */}
						{cardType !== 'generic' && (
							<Box className={`co-pay__card-type co-pay__card-type--${cardType}`}>
								<CreditCardIcon sx={{ fontSize: 14 }} />
								{CARD_LABELS[cardType]}
							</Box>
						)}

						<TextField
							fullWidth
							label="Cardholder Name"
							value={cardName}
							onChange={(e) => setCardName(e.target.value)}
							error={!!fieldErrors.cardName}
							helperText={fieldErrors.cardName}
							sx={{ mb: 2 }}
						/>
						<TextField
							fullWidth
							label="Card Number"
							value={cardNumber}
							onChange={(e) => setCardNumber(formatCardNumber(e.target.value, cardType))}
							placeholder="XXXX XXXX XXXX XXXX"
							inputProps={{ maxLength: 19 }}
							error={!!fieldErrors.cardNumber}
							helperText={fieldErrors.cardNumber}
							sx={{ mb: 2 }}
						/>
						<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
							<TextField
								fullWidth
								label="Expiry (MM / YY)"
								value={cardExpiry}
								onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
								placeholder="MM / YY"
								inputProps={{ maxLength: 7 }}
								error={!!fieldErrors.cardExpiry}
								helperText={fieldErrors.cardExpiry}
							/>
							<TextField
								fullWidth
								label={
									<Stack direction="row" alignItems="center" gap={0.5} component="span">
										CVV
										<Tooltip title={cardType === 'amex' ? '4-digit code on front of card' : '3-digit code on back of card'} arrow>
											<HelpOutlineIcon sx={{ fontSize: 14, cursor: 'help', opacity: 0.6 }} />
										</Tooltip>
									</Stack>
								}
								value={cardCvv}
								onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, maxCvv))}
								placeholder={cardType === 'amex' ? '1234' : '123'}
								inputProps={{ maxLength: maxCvv }}
								error={!!fieldErrors.cardCvv}
								helperText={fieldErrors.cardCvv}
								type="password"
							/>
						</Stack>

						<FormControlLabel
							control={
								<Checkbox
									checked={agreeTerms}
									onChange={() => { setAgreeTerms(!agreeTerms); setFieldErrors((e) => ({ ...e, agreeTerms: '' })); }}
								/>
							}
							label="I agree with the terms & conditions"
						/>
						{fieldErrors.agreeTerms && (
							<Typography variant="caption" color="error">{fieldErrors.agreeTerms}</Typography>
						)}

						<Button
							fullWidth
							variant="contained"
							disabled={loading}
							onClick={handleFakePayment}
							sx={{ mt: 2 }}
						>
							{loading ? <CircularProgress size={20} /> : 'Proceed to Checkout'}
						</Button>
					</Box>

					<Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
						<Button onClick={() => router.push('/store')}>Return to Store</Button>
						<Button color="error" onClick={() => basketItemsVar([])}>Empty Cart</Button>
					</Stack>
				</Box>
			</Stack>
		</Box>
	);
};

export default withLayoutBasic(Checkout);
